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
            let size = 1; // Includes self
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

        getTeamSizeWithLimit(maxDepth) {
            // maxDepth is relative to this node. 0 means only self.
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
    // Canvas sizing
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

    // --- Toolbar Actions ---

    document.getElementById('btn-reset').onclick = () => {
        if (confirm('هل أنت متأكد من تصفير الشجرة؟')) resetTree();
    };

    document.getElementById('btn-default').onclick = () => {
        buildDefaultTree();
    };

    document.getElementById('btn-unbalanced').onclick = () => {
        buildUnbalancedTree();
    };

    // Zoom/Pan
    document.getElementById('btn-zoom-in').onclick = () => { zoomLevel *= 1.2; requestDraw(); };
    document.getElementById('btn-zoom-out').onclick = () => { zoomLevel /= 1.2; requestDraw(); };
    document.getElementById('btn-reset-view').onclick = () => { centerView(); };

    // Add Random Modal
    const modal = document.getElementById('modal-add-random');
    const modalInfo = document.getElementById('modal-add-info');
    const addCountInput = document.getElementById('add-count-input');

    document.getElementById('btn-add-random').onclick = () => {
        const target = selectedMember || rootMember;
        modalInfo.innerText = `الإضافة تحت العضو رقم: ${target.id} (الجيل: ${target.generation})`;
        modal.classList.remove('hidden');
    };

    document.getElementById('btn-cancel-add').onclick = () => {
        modal.classList.add('hidden');
    };




    // --- Logic Builders (Ported from Python) ---

    function buildDefaultTree() {
        resetTree();
        const gens = parseInt(inputs.generations.value) || 11;
        const maxGen = Math.min(gens, 20); // Limit to 20 for logic, similar to python

        function buildBalanced(parent, currentGen) {
            if (currentGen >= maxGen) return;

            // Right
            parent.rightChild = new Member(nextId++, currentGen + 1, parent);
            parent.rightChild.isActive = true;

            // Left
            parent.leftChild = new Member(nextId++, currentGen + 1, parent);
            parent.leftChild.isActive = true;

            buildBalanced(parent.rightChild, currentGen + 1);
            buildBalanced(parent.leftChild, currentGen + 1);
        }

        buildBalanced(rootMember, 1);
        updateEverything();
        alert(`تم بناء الشجرة الافتراضية (${maxGen} جيل)!`);
        centerView();
    }

    function buildUnbalancedTree() {
        resetTree();

        const targetCounts = [
            /* Gen 1 is root */
            { r: 0, l: 0 }, // Gen 1 (Root has no R/L lines in user table, its children are Gen 2)
            { r: 1, l: 1 }, // Gen 2 (1 R child, 1 L child)
            { r: 2, l: 2 }, // Gen 3
            { r: 4, l: 4 }, // Gen 4
            { r: 8, l: 7 }, // Gen 5
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

        // membersByGen = { genNumber: [Member, Member...] }
        let membersByGen = {};
        membersByGen[1] = [rootMember];

        for (let i = 0; i < targetCounts.length; i++) { // i=0 refer to Gen 1 logic target
            const currentGen = i + 1;
            if (currentGen >= 20) break;

            const nextGen = currentGen + 1;
            membersByGen[nextGen] = [];

            const currentMembers = membersByGen[currentGen] || [];
            if (currentMembers.length === 0) break;

            // Target for Next Gen
            // logic: We are AT `currentGen`, we want to create children for `nextGen`.
            // The table targetCounts is 0-indexed. Gen 1 is index 0.
            // Target for Gen2 is at index 1.
            let neededRight = 0, neededLeft = 0;
            if (i + 1 < targetCounts.length) {
                neededRight = targetCounts[i + 1].r;
                neededLeft = targetCounts[i + 1].l;
            }

            // Shuffle parents
            let potentialParents = [...currentMembers];
            potentialParents.sort(() => Math.random() - 0.5);

            if (currentGen === 1) {
                // Root
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
                // Split parents into RightSide and LeftSide of Root
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

                // Add needed to Right Side parents
                let addedR = 0;
                for (let p of parentsRight) {
                    if (addedR >= neededRight) break;
                    // Try add right
                    if (addedR < neededRight) {
                        p.rightChild = new Member(nextId++, nextGen, p);
                        p.rightChild.isActive = true;
                        membersByGen[nextGen].push(p.rightChild);
                        addedR++;
                    }
                    // Try add left
                    if (addedR < neededRight) {
                        p.leftChild = new Member(nextId++, nextGen, p);
                        p.leftChild.isActive = true;
                        membersByGen[nextGen].push(p.leftChild);
                        addedR++;
                    }
                }

                // Add needed to Left Side parents
                let addedL = 0;
                for (let p of parentsLeft) {
                    if (addedL >= neededLeft) break;
                    if (addedL < neededLeft) {
                        p.rightChild = new Member(nextId++, nextGen, p);
                        p.rightChild.isActive = true;
                        membersByGen[nextGen].push(p.rightChild);
                        addedL++;
                    }
                    if (addedL < neededLeft) {
                        p.leftChild = new Member(nextId++, nextGen, p);
                        p.leftChild.isActive = true;
                        membersByGen[nextGen].push(p.leftChild);
                        addedL++;
                    }
                }
            }
        }

        updateEverything();
        alert("تم بناء الشجرة غير المتوازنة!");
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
        // 1. Walk tree to count R/L per gen for the table
        const counts = {}; // { gen: {r:0, l:0, total: 0} }

        // Init counts
        for (let i = 1; i <= 25; i++) counts[i] = { r: 0, l: 0, total: 0 };

        // Traverse
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

        // Update Table UI & Logic Arrays (for rendering)
        renderTableAndCalc(counts);

        // Update Info Label
        const total = rootMember.getTeamSize();
        infoLabel.innerText = `إجمالي الأعضاء: ${total}`;

        // Redraw
        requestDraw();
    }

    function renderTableAndCalc(counts) {
        // Calc Inputs
        const price = parseFloat(inputs.price.value) || 0;
        const dedPct = parseFloat(inputs.deduction.value) || 0;
        const comPct = parseFloat(inputs.companyPct.value) || 0;
        const gens = parseInt(inputs.generations.value) || 11;
        const capVal = parseFloat(inputs.cap.value) || 5000;

        // Header Calcs
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

        // Tree Calcs (Arrays for columns)
        // Need to calculate commissions PER GEN
        // Python: `_calculate_commissions_from_tree` adds to array slots.

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

            // 2. With Stopper (Limited Depth * Share)
            // Limit = (gens - 1)
            let maxDepth = gens - 1;
            if (maxDepth < 0) maxDepth = 0;

            const teamSizeLimit = member.getTeamSizeWithLimit(maxDepth);
            arrStop[g] += teamSizeLimit * share;

            // 3. Bottom Up (Beneficiaries * Share)
            // min(member.gen, gens)
            const ben = Math.min(member.generation, gens);
            arrBottom[g] += ben * share;

            traverseComm(member.leftChild);
            traverseComm(member.rightChild);
        }

        traverseComm(rootMember);

        // Populate Table DOM
        treeBody.innerHTML = '';
        let sumR = 0, sumL = 0, sumMem = 0, sumInc = 0, sumNoS = 0, sumS = 0, sumB = 0;

        for (let i = 1; i <= 25; i++) { // Show 25 rows
            const c = counts[i];
            const tr = document.createElement('tr');

            // Gen
            tr.innerHTML += `<td>${i}</td>`;
            // R / L (Readonly)
            tr.innerHTML += `<td class='readonly-col'>${c.r}</td>`;
            tr.innerHTML += `<td class='readonly-col'>${c.l}</td>`;

            // Total
            let genTotal = 0;
            if (i === 1) genTotal = 1;
            else genTotal = c.r + c.l;

            tr.innerHTML += `<td>${genTotal}</td>`;

            // Income (Total * Share) - as per Python "income" column
            const income = genTotal * share;
            tr.innerHTML += `<td>${income.toFixed(2)}</td>`;

            // Comm Columns (from arrays)
            const commNo = arrNoStop[i];
            const commSt = arrStop[i];
            const commBt = arrBottom[i];

            tr.innerHTML += `<td>${commNo.toFixed(2)}</td>`;
            tr.innerHTML += `<td>${commSt.toFixed(2)}</td>`;
            tr.innerHTML += `<td>${commBt.toFixed(2)}</td>`;

            treeBody.appendChild(tr);

            // Sums
            sumR += c.r;
            sumL += c.l;
            sumMem += genTotal;
            sumInc += income;
            sumNoS += commNo;
            sumS += commSt;
            sumB += commBt;
        }

        // Footer
        outputs.totalRight.innerText = sumR;
        outputs.totalLeft.innerText = sumL;
        outputs.totalMembers.innerText = sumMem;
        outputs.totalIncome.innerText = sumInc.toFixed(2);
        outputs.totalCommNoStop.innerText = sumNoS.toFixed(2);
        outputs.totalCommStop.innerText = sumS.toFixed(2);
        outputs.totalCommBottom.innerText = sumB.toFixed(2);

        // Final Cards
        const totalAllocated = sumMem * mShare; // Based on total * share_plan? NO, Python: `total_members * income_plan_share`
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
        // Calculate Positions
        // Recursive layout
        // y = 50 + depth * 80
        // x = middle of available range

        // To make panning work, we don't recalculate pos on Pan, just on data change.
        // But for visual simplicity, let's recalc positions every draw based on canvas width, or fixed width?
        // Fixed width virtual space is better for huge trees.
        // Let's assume a large virtual width based on max members in a gen?

        calculatePositions(rootMember, 50, 0, canvas.width / zoomLevel); // simplified

        // Draw
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        // Apply Pan/Zoom
        ctx.translate(offsetX, offsetY);
        ctx.scale(zoomLevel, zoomLevel);

        // Draw Connections
        drawConnections(rootMember);
        // Draw Nodes
        drawNodes(rootMember);

        ctx.restore();
    }

    function calculatePositions(node, y, minX, maxX) {
        if (!node) return;
        node.x = (minX + maxX) / 2;
        node.y = y;

        if (node.leftChild || node.rightChild) {
            const mid = (minX + maxX) / 2;
            // Give slightly more space if needed, simplest is equal split
            calculatePositions(node.leftChild, y + 80, minX, mid);
            calculatePositions(node.rightChild, y + 80, mid, maxX);
        }
    }

    function drawConnections(node) {
        if (!node) return;

        const screenX = node.x * zoomLevel + offsetX;
        const screenY = node.y * zoomLevel + offsetY;

        // Optimization: Stop if parent is way way below screen
        if (screenY > canvas.height + 100) return;

        if (node.leftChild) {
            const childX = node.leftChild.x * zoomLevel + offsetX;
            const childY = node.leftChild.y * zoomLevel + offsetY;

            // Only draw if at least one point is close to screen
            // or if the line crosses the screen (simplified check)
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

        // --- PERFORMANCE OPTIMIZATION (CULLING) ---
        // Calculate screen positions
        const screenX = node.x * zoomLevel + offsetX;
        const screenY = node.y * zoomLevel + offsetY;
        const radius = 25 * zoomLevel;

        // 1. Vertical Culling (The most important)
        // If node is below the bottom of the canvas, its children are definitely below too. Stop recursion.
        if (screenY - radius > canvas.height) {
            return;
        }

        // 2. Screen Bound Check for Drawing
        // Only draw the circle/text if it's actually visible on screen
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

            // Text (Only if large enough)
            if (zoomLevel > 0.2) {
                ctx.fillStyle = 'white';
                // Adjust font size based on zoom
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
        offsetX = canvas.width / 2 - (canvas.width / 2); // Center X? No, 0 is fine if calcPositions centers it.
        // Wait, calcPositions uses (0, width). So root is at width/2.
        // So default offset 0 is fine.
        offsetY = 50;
        zoomLevel = 1.0;
        requestDraw();
    }

    // Canvas Interactions
    canvas.addEventListener('mousedown', e => {
        isDragging = true;
        dragStartX = e.offsetX;
        dragStartY = e.offsetY;

        // Check click on member
        const rect = canvas.getBoundingClientRect();
        // Transform mouse to world
        const mx = (e.offsetX - offsetX) / zoomLevel;
        const my = (e.offsetY - offsetY) / zoomLevel;

        const clicked = findMemberAt(rootMember, mx, my);
        if (clicked) {
            selectedMember = clicked;
            requestDraw();
            // Show info?
            // Could update an info panel
            // Or use alert like Python? No, let's use console or small update for now.
            // console.log("Selected:", selectedMember.id);
        }
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    canvas.addEventListener('mousemove', e => {
        if (isDragging) {
            offsetX += e.offsetX - dragStartX;
            offsetY += e.offsetY - dragStartY;
            dragStartX = e.offsetX;
            dragStartY = e.offsetY;
            requestDraw();
        }
    });

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        if (e.deltaY < 0) zoomLevel *= 1.1;
        else zoomLevel /= 1.1;
        requestDraw();
    });

    function findMemberAt(node, x, y) {
        if (!node) return null;
        const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
        if (dist <= 20) return node;

        let res = findMemberAt(node.leftChild, x, y);
        if (res) return res;
        return findMemberAt(node.rightChild, x, y);
    }

    // Listen to Inputs changes
    Object.values(inputs).forEach(inp => {
        if (inp && !inp.readOnly) {
            inp.addEventListener('input', updateEverything);
        }
    });


    // Start
    resetTree();
    updateEverything();
});
