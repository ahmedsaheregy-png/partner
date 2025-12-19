document.addEventListener('DOMContentLoaded', function () {

    // --- References ---
    const canvas = document.getElementById('treeCanvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('canvas-container');

    // Inputs
    const inputs = {
        price: document.getElementById('product_price'),
        deduction: document.getElementById('deduction_percent'),
        companyPct: document.getElementById('company_percent'),
        generations: document.getElementById('generations_count'),
        cap: document.getElementById('cap'),

        // Readonlys
        deductedAmt: document.getElementById('deducted_amount'),
        compShare: document.getElementById('company_share'),
        memPct: document.getElementById('members_percent'),
        memShare: document.getElementById('members_share'),
        defTotal: document.getElementById('default_total_members'),
        sharePer: document.getElementById('share_per_member')
    };

    // Outputs
    const outputs = {
        totalRight: document.getElementById('total-right'),
        totalLeft: document.getElementById('total-left'),
        totalMembers: document.getElementById('total-members'),
        totalIncome: document.getElementById('total-income'),
        totalCommNoStop: document.getElementById('total-comm-no-stopper'),
        totalCommStop: document.getElementById('total-comm-with-stopper'),
        totalCommBottom: document.getElementById('total-comm-bottom-up'),

        planInc: document.getElementById('total_income_plan'),
        distInc: document.getElementById('total_distributed'),
        validCheck: document.getElementById('validation_check'),
        validCard: document.getElementById('validation_card')
    };

    const treeBody = document.getElementById('tree-body');
    const infoLabel = document.getElementById('tree-info-label');

    // --- State ---
    class Member {
        constructor(id, generation, parent = null) {
            this.id = id;
            this.generation = generation;
            this.parent = parent;
            this.leftChild = null;
            this.rightChild = null;
            this.isActive = false;

            // Visualization
            this.x = 0;
            this.y = 0;
        }

        getTeamSize() {
            let size = 1;
            if (this.leftChild) size += this.leftChild.getTeamSize();
            if (this.rightChild) size += this.rightChild.getTeamSize();
            return size;
        }

        getRightCount() {
            return this.rightChild ? this.rightChild.getTeamSize() : 0;
        }

        getLeftCount() {
            return this.leftChild ? this.leftChild.getTeamSize() : 0;
        }

        // ✅ إضافة دالة حساب العمولة (من Python)
        getCommission(sharePerMember) {
            return this.getTeamSize() * sharePerMember;
        }

        getTeamSizeWithLimit(maxDepth) {
            return this._countWithDepth(0, maxDepth);
        }

        _countWithDepth(currentDepth, maxDepth) {
            let count = 1;
            if (currentDepth >= maxDepth) return count;

            if (this.leftChild) count += this.leftChild._countWithDepth(currentDepth + 1, maxDepth);
            if (this.rightChild) count += this.rightChild._countWithDepth(currentDepth + 1, maxDepth);
            return count;
        }
    }

    let rootMember = null;
    let nextId = 2;
    let selectedMember = null;

    // View State
    let zoomLevel = 1.0;
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    // --- Initialization ---
    function resizeCanvas() {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        requestDraw();
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function resetTree() {
        rootMember = new Member(1, 1);
        rootMember.isActive = true;
        nextId = 2;
        selectedMember = null;
        updateEverything();
        centerView();
    }

    // ✅ حساب الـ Cap الافتراضي (من Python)
    function calculateDefaultCap() {
        try {
            const price = parseFloat(inputs.price.value) || 330;
            const dedPct = parseFloat(inputs.deduction.value) || 10;
            const comPct = parseFloat(inputs.companyPct.value) || 25;
            const gens = parseInt(inputs.generations.value) || 11;

            const deducted = price * (dedPct / 100);
            const membersShare = deducted * ((100 - comPct) / 100);
            const sharePer = membersShare / gens;
            const totalMembers = Math.pow(2, gens) - 1;
            const totalCommission = totalMembers * sharePer;

            return Math.floor(totalCommission);
        } catch (e) {
            return 5000;
        }
    }

    // ✅ عند تغيير المدخلات - إعادة حساب Cap (من Python)
    function onInputChange() {
        const newCap = calculateDefaultCap();
        inputs.cap.value = newCap;
        updateEverything();
    }

    // ✅ عند تغيير عدد الأجيال - إعادة بناء الشجرة (من Python)
    function onGenerationsChange() {
        const newCap = calculateDefaultCap();
        inputs.cap.value = newCap;
        buildDefaultTree();
    }

    // --- Toolbar Actions ---

    document.getElementById('btn-reset').onclick = () => {
        if (confirm('هل أنت متأكد من تصفير الشجرة؟')) {
            resetTree();
            showToast('تم تصفير الشجرة بنجاح!');
        }
    };

    document.getElementById('btn-default').onclick = () => {
        buildDefaultTree();
    };

    document.getElementById('btn-unbalanced').onclick = () => {
        buildUnbalancedTree();
    };

    // Zoom/Pan
    document.getElementById('btn-zoom-in').onclick = () => { zoomIn(); };
    document.getElementById('btn-zoom-out').onclick = () => { zoomOut(); };
    document.getElementById('btn-reset-view').onclick = () => { centerView(); };

    function zoomIn() {
        zoomLevel *= 1.2;
        requestDraw();
    }

    function zoomOut() {
        zoomLevel /= 1.2;
        requestDraw();
    }

    // ✅ اختصارات لوحة المفاتيح (من Python)
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return; // تجاهل إذا كان المستخدم يكتب في حقل

        switch (e.key) {
            case 'ArrowUp':
                offsetY += 50;
                requestDraw();
                break;
            case 'ArrowDown':
                offsetY -= 50;
                requestDraw();
                break;
            case 'ArrowLeft':
                offsetX += 50;
                requestDraw();
                break;
            case 'ArrowRight':
                offsetX -= 50;
                requestDraw();
                break;
            case '+':
            case '=':
                if (e.ctrlKey) zoomIn();
                break;
            case '-':
                if (e.ctrlKey) zoomOut();
                break;
            case '0':
                if (e.ctrlKey) centerView();
                break;
        }
    });

    // Add Random Modal
    const modal = document.getElementById('modal-add-random');
    const modalInfo = document.getElementById('modal-add-info');
    const addCountInput = document.getElementById('add-count-input');

    document.getElementById('btn-add-random').onclick = () => {
        const target = selectedMember || rootMember;
        // ✅ عرض معلومات إضافية (من Python)
        modalInfo.innerHTML = `الإضافة تحت العضو رقم: <strong>${target.id}</strong><br>
                              الجيل: ${target.generation} | الفريق الحالي: ${target.getTeamSize()}`;
        modal.classList.remove('hidden');
    };

    document.getElementById('btn-cancel-add').onclick = () => {
        modal.classList.add('hidden');
    };

    document.getElementById('btn-confirm-add').onclick = () => {
        const count = parseInt(addCountInput.value);
        if (count > 0) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            addCountInput.value = '10';

            setTimeout(() => {
                modal.style.display = '';
            }, 500);

            setTimeout(() => {
                const added = addRandomMembers(selectedMember || rootMember, count);
                updateEverything();
                // ✅ رسالة نجاح (من Python)
                showToast(`تم إضافة ${added} عضو بنجاح!`);
            }, 50);
        }
    };

    // ✅ دالة عرض الإشعارات (Toast)
    function showToast(message) {
        // إنشاء عنصر Toast إذا لم يكن موجوداً
        let toast = document.getElementById('toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-notification';
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                padding: 15px 30px;
                border-radius: 10px;
                font-family: 'Cairo', sans-serif;
                font-weight: bold;
                font-size: 1rem;
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.opacity = '1';

        setTimeout(() => {
            toast.style.opacity = '0';
        }, 3000);
    }


    // --- Logic Builders (Ported from Python) ---

    function buildDefaultTree() {
        rootMember = new Member(1, 1);
        rootMember.isActive = true;
        nextId = 2;
        selectedMember = null;

        const gens = parseInt(inputs.generations.value) || 11;
        const maxGen = Math.min(gens, 20);

        function buildBalanced(parent, currentGen) {
            if (currentGen >= maxGen) return;

            parent.rightChild = new Member(nextId++, currentGen + 1, parent);
            parent.rightChild.isActive = true;

            parent.leftChild = new Member(nextId++, currentGen + 1, parent);
            parent.leftChild.isActive = true;

            buildBalanced(parent.rightChild, currentGen + 1);
            buildBalanced(parent.leftChild, currentGen + 1);
        }

        buildBalanced(rootMember, 1);
        updateEverything();
        showToast(`تم بناء الشجرة الافتراضية (${maxGen} جيل)!`);
        centerView();
    }

    function buildUnbalancedTree() {
        rootMember = new Member(1, 1);
        rootMember.isActive = true;
        nextId = 2;
        selectedMember = null;

        const targetCounts = [
            { r: 0, l: 0 },
            { r: 1, l: 1 },
            { r: 2, l: 2 },
            { r: 4, l: 4 },
            { r: 8, l: 7 },
            { r: 16, l: 9 },
            { r: 32, l: 8 },
            { r: 55, l: 8 },
            { r: 91, l: 8 },
            { r: 137, l: 1 },
            { r: 186, l: 0 },
            { r: 223, l: 0 },
            { r: 232, l: 0 },
            { r: 236, l: 0 },
            { r: 218, l: 0 },
            { r: 193, l: 0 },
            { r: 147, l: 0 },
            { r: 108, l: 0 },
            { r: 64, l: 0 },
            { r: 32, l: 0 }
        ];

        let membersByGen = {};
        membersByGen[1] = [rootMember];

        for (let i = 0; i < targetCounts.length; i++) {
            const currentGen = i + 1;
            if (currentGen >= 20) break;

            const nextGen = currentGen + 1;
            membersByGen[nextGen] = [];

            const currentMembers = membersByGen[currentGen] || [];
            if (currentMembers.length === 0) break;

            let neededRight = 0, neededLeft = 0;
            if (i + 1 < targetCounts.length) {
                neededRight = targetCounts[i + 1].r;
                neededLeft = targetCounts[i + 1].l;
            }

            let potentialParents = [...currentMembers];
            potentialParents.sort(() => Math.random() - 0.5);

            if (currentGen === 1) {
                if (neededRight > 0) {
                    rootMember.rightChild = new Member(nextId++, 2, rootMember);
                    rootMember.rightChild.isActive = true;
                    membersByGen[2].push(rootMember.rightChild);
                }
                if (neededLeft > 0) {
                    rootMember.leftChild = new Member(nextId++, 2, rootMember);
                    rootMember.leftChild.isActive = true;
                    membersByGen[2].push(rootMember.leftChild);
                }
            } else {
                const parentsRight = [];
                const parentsLeft = [];

                currentMembers.forEach(m => {
                    let temp = m;
                    while (temp.parent && temp.parent !== rootMember) {
                        temp = temp.parent;
                    }
                    if (temp.parent === rootMember) {
                        if (temp === rootMember.rightChild) parentsRight.push(m);
                        else if (temp === rootMember.leftChild) parentsLeft.push(m);
                    }
                });

                let addedR = 0;
                for (let p of parentsRight) {
                    if (addedR >= neededRight) break;
                    if (addedR < neededRight && !p.rightChild) {
                        p.rightChild = new Member(nextId++, nextGen, p);
                        p.rightChild.isActive = true;
                        membersByGen[nextGen].push(p.rightChild);
                        addedR++;
                    }
                    if (addedR < neededRight && !p.leftChild) {
                        p.leftChild = new Member(nextId++, nextGen, p);
                        p.leftChild.isActive = true;
                        membersByGen[nextGen].push(p.leftChild);
                        addedR++;
                    }
                }

                let addedL = 0;
                for (let p of parentsLeft) {
                    if (addedL >= neededLeft) break;
                    if (addedL < neededLeft && !p.rightChild) {
                        p.rightChild = new Member(nextId++, nextGen, p);
                        p.rightChild.isActive = true;
                        membersByGen[nextGen].push(p.rightChild);
                        addedL++;
                    }
                    if (addedL < neededLeft && !p.leftChild) {
                        p.leftChild = new Member(nextId++, nextGen, p);
                        p.leftChild.isActive = true;
                        membersByGen[nextGen].push(p.leftChild);
                        addedL++;
                    }
                }
            }
        }

        updateEverything();
        showToast("تم بناء الشجرة غير المتوازنة!");
        centerView();
    }

    function addRandomMembers(startNode, count) {
        let added = 0;
        let pool = [];

        function collect(node) {
            if (!node || node.generation >= 25) return;
            if (!node.leftChild || !node.rightChild) pool.push(node);

            if (node.leftChild) collect(node.leftChild);
            if (node.rightChild) collect(node.rightChild);
        }
        collect(startNode);

        if (pool.length === 0) return 0;

        let safety = 0;
        while (added < count && pool.length > 0 && safety < 10000) {
            safety++;

            const idx = Math.floor(Math.random() * pool.length);
            const current = pool[idx];

            let slots = [];
            if (!current.leftChild) slots.push('left');
            if (!current.rightChild) slots.push('right');

            if (slots.length === 0) {
                pool.splice(idx, 1);
                continue;
            }

            const side = slots[Math.floor(Math.random() * slots.length)];
            const newMem = new Member(nextId++, current.generation + 1, current);
            newMem.isActive = true;

            if (side === 'left') current.leftChild = newMem;
            else current.rightChild = newMem;

            added++;

            if (newMem.generation < 25) {
                pool.push(newMem);
            }

            if (current.leftChild && current.rightChild) {
                pool.splice(idx, 1);
            }
        }
        return added;
    }


    // --- Updates & Calculations ---

    function updateEverything() {
        const counts = {};
        for (let i = 1; i <= 25; i++) counts[i] = { r: 0, l: 0, total: 0 };

        function traverseCount(node, isRightBranchOfRoot) {
            if (!node) return;
            const g = node.generation;
            if (g > 25) return;

            if (node !== rootMember) {
                if (isRightBranchOfRoot) counts[g].r++;
                else counts[g].l++;
            }
            traverseCount(node.leftChild, isRightBranchOfRoot);
            traverseCount(node.rightChild, isRightBranchOfRoot);
        }

        traverseCount(rootMember.rightChild, true);
        traverseCount(rootMember.leftChild, false);

        renderTableAndCalc(counts);

        const total = rootMember.getTeamSize();
        infoLabel.innerText = `إجمالي الأعضاء: ${total}`;

        requestDraw();
    }

    function renderTableAndCalc(counts) {
        const price = parseFloat(inputs.price.value) || 0;
        const dedPct = parseFloat(inputs.deduction.value) || 0;
        const comPct = parseFloat(inputs.companyPct.value) || 0;
        const gens = parseInt(inputs.generations.value) || 11;
        const capVal = parseFloat(inputs.cap.value) || 5000;

        const deducted = price * (dedPct / 100);
        inputs.deductedAmt.value = deducted.toFixed(2);
        const cShare = deducted * (comPct / 100);
        inputs.compShare.value = cShare.toFixed(2);
        inputs.memPct.value = (100 - comPct).toFixed(2);
        const mShare = deducted - cShare;
        inputs.memShare.value = mShare.toFixed(2);
        const defTotal = Math.pow(2, gens) - 1;
        inputs.defTotal.value = defTotal;

        let share = (gens > 0) ? (mShare / gens) : 0;
        if (share > capVal) share = capVal;
        inputs.sharePer.value = share.toFixed(2);

        let arrNoStop = new Array(26).fill(0);
        let arrStop = new Array(26).fill(0);
        let arrBottom = new Array(26).fill(0);

        function traverseComm(member) {
            if (!member) return;
            const g = member.generation;
            if (g > 25) return;

            // 1. No Stopper (Team Size * Share)
            const teamSize = member.getTeamSize();
            arrNoStop[g] += teamSize * share;

            // ✅ 2. With Stopper - نسبي للعضو (مطابق لـ Python سطر 562)
            // الستوبر: كل عضو يأخذ من (generations - 1) عمق تحته
            // هذا يعني الشخص الأول يأخذ 11 مستوى، والثاني يأخذ 11 مستوى من تحته وهكذا
            let maxDepth = gens - 1;
            if (maxDepth < 0) maxDepth = 0;
            const teamSizeLimit = member.getTeamSizeWithLimit(maxDepth);
            arrStop[g] += teamSizeLimit * share;

            // 3. Bottom Up (Beneficiaries * Share)
            const ben = Math.min(member.generation, gens);
            arrBottom[g] += ben * share;

            traverseComm(member.leftChild);
            traverseComm(member.rightChild);
        }

        traverseComm(rootMember);

        treeBody.innerHTML = '';
        let sumR = 0, sumL = 0, sumMem = 0, sumInc = 0, sumNoS = 0, sumS = 0, sumB = 0;

        for (let i = 1; i <= 25; i++) {
            const c = counts[i];
            const tr = document.createElement('tr');

            tr.innerHTML += `<td>${i}</td>`;
            tr.innerHTML += `<td class='readonly-col'>${c.r}</td>`;
            tr.innerHTML += `<td class='readonly-col'>${c.l}</td>`;

            let genTotal = 0;
            if (i === 1) genTotal = 1;
            else genTotal = c.r + c.l;

            tr.innerHTML += `<td>${genTotal}</td>`;

            const income = genTotal * share;
            tr.innerHTML += `<td>${income.toFixed(2)}</td>`;

            const commNo = arrNoStop[i];
            const commSt = arrStop[i];
            const commBt = arrBottom[i];

            tr.innerHTML += `<td>${commNo.toFixed(2)}</td>`;
            tr.innerHTML += `<td>${commSt.toFixed(2)}</td>`;
            tr.innerHTML += `<td>${commBt.toFixed(2)}</td>`;

            treeBody.appendChild(tr);

            sumR += c.r;
            sumL += c.l;
            sumMem += genTotal;
            sumInc += income;
            sumNoS += commNo;
            sumS += commSt;
            sumB += commBt;
        }

        outputs.totalRight.innerText = sumR;
        outputs.totalLeft.innerText = sumL;
        outputs.totalMembers.innerText = sumMem;
        outputs.totalIncome.innerText = sumInc.toFixed(2);
        outputs.totalCommNoStop.innerText = sumNoS.toFixed(2);
        outputs.totalCommStop.innerText = sumS.toFixed(2);
        outputs.totalCommBottom.innerText = sumB.toFixed(2);

        const totalAllocated = sumMem * mShare;
        outputs.planInc.innerText = totalAllocated.toFixed(2);
        outputs.distInc.innerText = sumS.toFixed(2);

        const valid = totalAllocated - sumS;
        outputs.validCheck.innerText = valid.toFixed(2);

        if (valid < -0.1) {
            outputs.validCard.className = 'output-card warning';
            outputs.validCard.style.background = '';
        } else {
            outputs.validCard.className = 'output-card padding';
            outputs.validCard.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
        }
    }


    // --- Canvas Drawing ---
    function requestDraw() {
        if (!rootMember) return;

        calculatePositions(rootMember, 50, 0, canvas.width / zoomLevel);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(zoomLevel, zoomLevel);

        drawConnections(rootMember);
        drawNodes(rootMember);

        ctx.restore();
    }

    function calculatePositions(node, y, minX, maxX) {
        if (!node) return;
        node.x = (minX + maxX) / 2;
        node.y = y;

        if (node.leftChild || node.rightChild) {
            const mid = (minX + maxX) / 2;
            calculatePositions(node.leftChild, y + 80, minX, mid);
            calculatePositions(node.rightChild, y + 80, mid, maxX);
        }
    }

    function drawConnections(node) {
        if (!node) return;

        const screenX = node.x * zoomLevel + offsetX;
        const screenY = node.y * zoomLevel + offsetY;

        if (screenY > canvas.height + 100) return;

        if (node.leftChild) {
            const childX = node.leftChild.x * zoomLevel + offsetX;
            const childY = node.leftChild.y * zoomLevel + offsetY;

            if (childY > -100 && screenY < canvas.height + 100) {
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(childX, childY);
                ctx.strokeStyle = '#aaa';
                ctx.lineWidth = Math.max(1, 2 * zoomLevel);
                ctx.stroke();
            }
            drawConnections(node.leftChild);
        }
        if (node.rightChild) {
            const childX = node.rightChild.x * zoomLevel + offsetX;
            const childY = node.rightChild.y * zoomLevel + offsetY;

            if (childY > -100 && screenY < canvas.height + 100) {
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(childX, childY);
                ctx.strokeStyle = '#aaa';
                ctx.lineWidth = Math.max(1, 2 * zoomLevel);
                ctx.stroke();
            }
            drawConnections(node.rightChild);
        }
    }

    function drawNodes(node) {
        if (!node) return;

        const screenX = node.x * zoomLevel + offsetX;
        const screenY = node.y * zoomLevel + offsetY;
        const radius = 25 * zoomLevel;

        if (screenY - radius > canvas.height) {
            return;
        }

        const isVisible = (
            screenX + radius > 0 &&
            screenX - radius < canvas.width &&
            screenY + radius > 0 &&
            screenY - radius < canvas.height
        );

        if (isVisible) {
            ctx.beginPath();
            ctx.arc(screenX, screenY, Math.max(5, radius), 0, Math.PI * 2);

            if (node === selectedMember) {
                ctx.fillStyle = '#FF9800';
                ctx.lineWidth = Math.max(2, 4 * zoomLevel);
                ctx.strokeStyle = '#E65100';
            } else {
                ctx.fillStyle = node.isActive ? '#4CAF50' : '#ccc';
                ctx.lineWidth = Math.max(1, 2 * zoomLevel);
                ctx.strokeStyle = '#fff';
            }

            ctx.fill();
            ctx.stroke();

            if (zoomLevel > 0.2) {
                ctx.fillStyle = 'white';
                const fontSize = Math.max(8, Math.min(24, 12 * zoomLevel));
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.id, screenX, screenY);
            }
        }

        drawNodes(node.leftChild);
        drawNodes(node.rightChild);
    }

    function centerView() {
        offsetX = 0;
        offsetY = 50;
        zoomLevel = 1.0;
        requestDraw();
    }

    // Canvas Interactions
    canvas.addEventListener('mousedown', e => {
        isDragging = true;
        dragStartX = e.offsetX;
        dragStartY = e.offsetY;

        const mx = (e.offsetX - offsetX) / zoomLevel;
        const my = (e.offsetY - offsetY) / zoomLevel;

        const clicked = findMemberAt(rootMember, mx, my);
        if (clicked) {
            selectedMember = clicked;
            requestDraw();
            // ✅ عرض بطاقة معلومات العضو (من Python)
            showMemberInfo(clicked);
        }
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    // متغيرات لتتبع الـ hover والتأخير
    let hoverMember = null;
    let hoverTimeout = null;

    canvas.addEventListener('mousemove', e => {
        if (isDragging) {
            offsetX += e.offsetX - dragStartX;
            offsetY += e.offsetY - dragStartY;
            dragStartX = e.offsetX;
            dragStartY = e.offsetY;
            requestDraw();
            // إخفاء بطاقة المعاينة أثناء السحب
            hideHoverCard();
        } else {
            // تحويل إحداثيات الماوس إلى إحداثيات الشجرة
            const mx = (e.offsetX - offsetX) / zoomLevel;
            const my = (e.offsetY - offsetY) / zoomLevel;

            // البحث عن العضو تحت المؤشر
            const memberUnderMouse = findMemberAt(rootMember, mx, my);

            // تغيير شكل المؤشر
            if (memberUnderMouse) {
                canvas.style.cursor = 'pointer';

                // عرض بطاقة المعاينة بعد تأخير قصير
                if (hoverMember !== memberUnderMouse) {
                    hoverMember = memberUnderMouse;
                    clearTimeout(hoverTimeout);
                    hoverTimeout = setTimeout(() => {
                        showHoverCard(memberUnderMouse, e.clientX, e.clientY);
                    }, 300); // تأخير 300ms قبل الظهور
                }
            } else {
                canvas.style.cursor = 'grab';

                // إخفاء البطاقة عند مغادرة الدائرة
                if (hoverMember) {
                    hoverMember = null;
                    clearTimeout(hoverTimeout);
                    hideHoverCard();
                }
            }
        }
    });

    // إخفاء البطاقة عند مغادرة الـ canvas
    canvas.addEventListener('mouseleave', () => {
        hoverMember = null;
        clearTimeout(hoverTimeout);
        hideHoverCard();
        canvas.style.cursor = 'default';
    });

    // دالة عرض بطاقة المعاينة (Hover Card)
    function showHoverCard(member, mouseX, mouseY) {
        const gens = parseInt(inputs.generations.value) || 11;
        const share = parseFloat(inputs.sharePer.value) || 0;

        // حساب العمولة بالستوبر
        let maxDepth = gens - 1;
        if (maxDepth < 0) maxDepth = 0;
        const teamSizeWithLimit = member.getTeamSizeWithLimit(maxDepth);
        const commWithStopper = teamSizeWithLimit * share;

        // حساب العمولة بدون ستوبر
        const teamSizeNoLimit = member.getTeamSize();
        const commNoStopper = teamSizeNoLimit * share;

        // عدد المستفيدين
        const beneficiariesCount = Math.min(member.generation, gens);

        // إنشاء/تحديث بطاقة المعاينة
        let hoverCard = document.getElementById('hover-info-card');
        if (!hoverCard) {
            hoverCard = document.createElement('div');
            hoverCard.id = 'hover-info-card';
            document.body.appendChild(hoverCard);
        }

        hoverCard.style.cssText = `
            position: fixed;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            border-radius: 12px;
            padding: 15px 20px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.4);
            z-index: 10003;
            font-family: 'Cairo', sans-serif;
            direction: rtl;
            min-width: 220px;
            pointer-events: none;
            display: block;
        `;

        // تحديد موقع البطاقة (بجانب المؤشر)
        let cardX = mouseX + 15;
        let cardY = mouseY + 15;

        // تأكد أن البطاقة لا تخرج عن الشاشة
        if (cardX + 250 > window.innerWidth) {
            cardX = mouseX - 250;
        }
        if (cardY + 200 > window.innerHeight) {
            cardY = mouseY - 200;
        }

        hoverCard.style.left = cardX + 'px';
        hoverCard.style.top = cardY + 'px';

        hoverCard.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 10px;">
                <div style="width: 40px; height: 40px; background: #FF9800; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem;">
                    ${member.id}
                </div>
                <div>
                    <div style="font-weight: bold; font-size: 1rem;">العضو #${member.id}</div>
                    <div style="font-size: 0.8rem; opacity: 0.8;">الجيل ${member.generation}</div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
                <div>
                    <div style="opacity: 0.7;">حجم الفريق</div>
                    <div style="font-weight: bold;">${member.getTeamSize()}</div>
                </div>
                <div>
                    <div style="opacity: 0.7;">يمين/يسار</div>
                    <div style="font-weight: bold;">${member.getRightCount()}/${member.getLeftCount()}</div>
                </div>
            </div>
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="opacity: 0.7;">💰 بالستوبر:</span>
                    <span style="font-weight: bold; color: #4CAF50;">${commWithStopper.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="opacity: 0.7;">💰 بدون ستوبر:</span>
                    <span style="font-weight: bold; color: #FFC107;">${commNoStopper.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="opacity: 0.7;">👥 المستفيدين:</span>
                    <span style="font-weight: bold;">${beneficiariesCount}</span>
                </div>
            </div>
            <div style="margin-top: 10px; text-align: center; font-size: 0.75rem; opacity: 0.6;">
                اضغط للمزيد من التفاصيل
            </div>
        `;

        // البطاقة تظهر مباشرة
    }

    // دالة إخفاء بطاقة المعاينة
    function hideHoverCard() {
        const hoverCard = document.getElementById('hover-info-card');
        if (hoverCard) {
            hoverCard.style.display = 'none';
        }
    }

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
    });

    function findMemberAt(node, x, y) {
        if (!node) return null;
        const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
        if (dist <= 20) return node;

        let res = findMemberAt(node.leftChild, x, y);
        if (res) return res;
        return findMemberAt(node.rightChild, x, y);
    }

    // ✅ بطاقة معلومات العضو (من Python - on_member_click)
    function showMemberInfo(member) {
        const gens = parseInt(inputs.generations.value) || 11;
        const share = parseFloat(inputs.sharePer.value) || 0;

        // 1️⃣ عمولة بدون ستوبر
        const teamSizeNoLimit = member.getTeamSize();
        const commNoStopper = teamSizeNoLimit * share;

        // 2️⃣ عمولة بالستوبر (ثابت لكل الأعضاء)
        // كل عضو يحصل على عمولة عن نفسه + 10 أجيال تحته = 11 مستوى
        let maxDepth = gens - 1;  // = 10 للجميع
        if (maxDepth < 0) maxDepth = 0;
        const teamSizeWithLimit = member.getTeamSizeWithLimit(maxDepth);
        const commWithStopper = teamSizeWithLimit * share;

        // 3️⃣ عدد المستفيدين منه
        const beneficiariesCount = Math.min(member.generation, gens);

        // إنشاء/تحديث البطاقة
        let infoCard = document.getElementById('member-info-card');
        if (!infoCard) {
            infoCard = document.createElement('div');
            infoCard.id = 'member-info-card';
            infoCard.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 15px;
                padding: 25px 35px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                z-index: 10001;
                font-family: 'Cairo', sans-serif;
                direction: rtl;
                min-width: 350px;
                text-align: center;
            `;
            document.body.appendChild(infoCard);
        }

        infoCard.innerHTML = `
            <div style="position: absolute; top: 10px; left: 10px; cursor: pointer; font-size: 20px; color: #999;" onclick="this.parentElement.style.display='none'">✕</div>
            <h2 style="color: #1e3c72; margin: 0 0 15px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
                👤 العضو #${member.id}
            </h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: right; margin-bottom: 15px;">
                <div><strong>الجيل:</strong> ${member.generation}</div>
                <div><strong>حجم الفريق:</strong> ${member.getTeamSize()}</div>
                <div><strong>الفرع الأيمن:</strong> ${member.getRightCount()}</div>
                <div><strong>الفرع الأيسر:</strong> ${member.getLeftCount()}</div>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 10px; margin-bottom: 10px;">
                <div style="font-size: 0.9rem; opacity: 0.9;">💰 عمولته (بدون ستوبر)</div>
                <div style="font-size: 1.5rem; font-weight: bold;">${commNoStopper.toFixed(2)}</div>
            </div>
            <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 15px; border-radius: 10px; margin-bottom: 10px;">
                <div style="font-size: 0.9rem; opacity: 0.9;">💰 عمولته (بالستوبر)</div>
                <div style="font-size: 1.5rem; font-weight: bold;">${commWithStopper.toFixed(2)}</div>
            </div>
            <div style="background: linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%); color: white; padding: 15px; border-radius: 10px;">
                <div style="font-size: 0.9rem; opacity: 0.9;">👥 عدد المستفيدين منه</div>
                <div style="font-size: 1.5rem; font-weight: bold;">${beneficiariesCount}</div>
            </div>
            <button onclick="this.parentElement.style.display='none'" style="margin-top: 20px; padding: 10px 30px; background: #1e3c72; color: white; border: none; border-radius: 8px; font-family: 'Cairo'; font-weight: bold; cursor: pointer;">
                إغلاق
            </button>
        `;
        infoCard.style.display = 'block';
    }

    // ✅ زر Top 100 (من Python)
    // أضف الزر في HTML أو أنشئه ديناميكياً
    function createTop100Button() {
        const outputSection = document.querySelector('.output-section .outputs-grid');
        if (!outputSection) return;

        // تحقق من عدم وجود الزر مسبقاً
        if (document.getElementById('btn-top-100')) return;

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'grid-column: 1 / -1; text-align: center; margin-top: 20px;';
        btnContainer.innerHTML = `
            <button id="btn-top-100" class="btn" style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #333; padding: 15px 30px; font-size: 1.1rem;">
                🏆 عرض أعلى 100 عمولة (Top 100)
            </button>
        `;
        outputSection.appendChild(btnContainer);

        document.getElementById('btn-top-100').onclick = showTop100;
    }

    // ✅ دالة عرض أعلى 100 عمولة (من Python)
    function showTop100() {
        const gens = parseInt(inputs.generations.value) || 11;
        const share = parseFloat(inputs.sharePer.value) || 0;

        // 1. جمع كل الأعضاء
        const allMembers = getAllMembers(rootMember);

        // 2. حساب العمولة لكل عضو
        const memberData = [];
        const limitDepth = gens - 1;

        for (const m of allMembers) {
            const countStopper = m.getTeamSizeWithLimit(limitDepth);
            const commission = countStopper * share;

            memberData.push({
                id: m.id,
                gen: m.generation,
                comm: commission,
                totalTeam: m.getTeamSize(),
                right: m.getRightCount(),
                left: m.getLeftCount()
            });
        }

        // 3. الترتيب التنازلي
        memberData.sort((a, b) => b.comm - a.comm);

        // 4. أخذ أعلى 100
        const top100 = memberData.slice(0, 100);

        // 5. عرض النافذة
        let top100Modal = document.getElementById('top100-modal');
        if (!top100Modal) {
            top100Modal = document.createElement('div');
            top100Modal.id = 'top100-modal';
            top100Modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 10002;
                display: flex;
                justify-content: center;
                align-items: center;
            `;
            document.body.appendChild(top100Modal);
        }

        let tableRows = '';
        for (let i = 0; i < top100.length; i++) {
            const d = top100[i];
            tableRows += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${d.id}</td>
                    <td>${d.gen}</td>
                    <td style="color: #27ae60; font-weight: bold;">${d.comm.toFixed(2)}</td>
                    <td>${d.totalTeam}</td>
                    <td>${d.right}</td>
                    <td>${d.left}</td>
                </tr>
            `;
        }

        top100Modal.innerHTML = `
            <div style="background: white; border-radius: 15px; padding: 30px; max-width: 900px; max-height: 80vh; overflow: auto; direction: rtl; font-family: 'Cairo', sans-serif;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #1e3c72;">🏆 أعلى ${top100.length} عمولة (بالستوبر)</h2>
                    <button onclick="document.getElementById('top100-modal').style.display='none'" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cairo';">✕ إغلاق</button>
                </div>
                <table style="width: 100%; border-collapse: collapse; text-align: center;">
                    <thead>
                        <tr style="background: #1e3c72; color: white;">
                            <th style="padding: 12px;">الترتيب</th>
                            <th style="padding: 12px;">كود العضو</th>
                            <th style="padding: 12px;">الجيل</th>
                            <th style="padding: 12px;">العمولة (بالستوبر)</th>
                            <th style="padding: 12px;">حجم الفريق</th>
                            <th style="padding: 12px;">يمين</th>
                            <th style="padding: 12px;">يسار</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
        top100Modal.style.display = 'flex';
    }

    // ✅ جمع كل الأعضاء (من Python)
    function getAllMembers(node) {
        const members = [];
        if (!node) return members;

        const stack = [node];
        while (stack.length > 0) {
            const current = stack.pop();
            members.push(current);
            if (current.rightChild) stack.push(current.rightChild);
            if (current.leftChild) stack.push(current.leftChild);
        }
        return members;
    }


    // Listen to Inputs changes
    // ✅ ربط التحديث التلقائي (من Python)
    inputs.price.addEventListener('input', onInputChange);
    inputs.deduction.addEventListener('input', onInputChange);
    inputs.companyPct.addEventListener('input', onInputChange);
    inputs.generations.addEventListener('input', onGenerationsChange);
    inputs.cap.addEventListener('input', updateEverything);


    // Start
    resetTree();
    updateEverything();
    createTop100Button();
});
