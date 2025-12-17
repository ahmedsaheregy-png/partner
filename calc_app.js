document.addEventListener('DOMContentLoaded', function () {

    // Inputs
    const product_price = document.getElementById('product_price');
    const deduction_percent = document.getElementById('deduction_percent');
    const deducted_amount = document.getElementById('deducted_amount');
    const company_percent = document.getElementById('company_percent');
    const company_share = document.getElementById('company_share');
    const members_percent = document.getElementById('members_percent');
    const members_share = document.getElementById('members_share');
    const generations_count = document.getElementById('generations_count');
    const default_total_members = document.getElementById('default_total_members');
    const share_per_member = document.getElementById('share_per_member');
    const cap = document.getElementById('cap');

    // Outputs
    const total_right_el = document.getElementById('total-right');
    const total_left_el = document.getElementById('total-left');
    const total_members_el = document.getElementById('total-members');
    const total_income_el = document.getElementById('total-income');
    const total_comm_no_stopper_el = document.getElementById('total-comm-no-stopper');
    const total_comm_with_stopper_el = document.getElementById('total-comm-with-stopper');
    const total_comm_bottom_up_el = document.getElementById('total-comm-bottom-up');

    // Final Section
    const total_income_plan_el = document.getElementById('total_income_plan');
    const total_distributed_el = document.getElementById('total_distributed');
    const validation_check_el = document.getElementById('validation_check');
    const validation_card = document.getElementById('validation_card');

    // Table Body
    const tree_body = document.getElementById('tree-body');

    // State for inputs (Right/Left lines per gen)
    // We initialize with default values (balanced tree)
    let tableState = [];

    function initTableState() {
        tableState = [];
        for (let i = 1; i <= 25; i++) {
            if (i === 1) {
                tableState.push({ r: 0, l: 0 });
            } else {
                // Default: each member of previous gen brings 2.
                // Gen 2 (i=2): prev=1. Total=2. R=1, L=1.
                // Gen 3 (i=3): prev=2. Total=4. R=2, L=2.
                // Formula: 2^(i-2) for each side
                let val = Math.pow(2, i - 2);
                tableState.push({ r: val, l: val });
            }
        }
    }

    function renderTableRows() {
        tree_body.innerHTML = '';
        tableState.forEach((row, index) => {
            const gen = index + 1;
            const tr = document.createElement('tr');

            // Gen
            const tdGen = document.createElement('td');
            tdGen.innerText = gen;
            tr.appendChild(tdGen);

            // Right Input
            const tdRight = document.createElement('td');
            const inpRight = document.createElement('input');
            inpRight.type = 'number';
            inpRight.value = row.r;
            inpRight.addEventListener('change', (e) => {
                row.r = parseInt(e.target.value) || 0;
                calculateAll();
            });
            tdRight.appendChild(inpRight);
            tr.appendChild(tdRight);

            // Left Input
            const tdLeft = document.createElement('td');
            const inpLeft = document.createElement('input');
            inpLeft.type = 'number';
            inpLeft.value = row.l;
            inpLeft.addEventListener('change', (e) => {
                row.l = parseInt(e.target.value) || 0;
                calculateAll();
            });
            tdLeft.appendChild(inpLeft);
            tr.appendChild(tdLeft);

            // Other Columns (Calculated)
            for (let k = 0; k < 5; k++) {
                const td = document.createElement('td');
                td.id = `row-${index}-col-${k}`;
                td.innerText = '-';
                tr.appendChild(td);
            }

            tree_body.appendChild(tr);
        });
    }

    // Attach Input Listeners
    const inputs = [product_price, deduction_percent, company_percent, generations_count, cap];
    inputs.forEach(inp => {
        inp.addEventListener('input', calculateAll);
    });

    // Main Calculator Logic
    function calculateAll() {
        // --- 1. Calculate Header Inputs ---
        const price = parseFloat(product_price.value) || 0;
        const ded_pct = parseFloat(deduction_percent.value) || 0;
        const com_pct = parseFloat(company_percent.value) || 0;
        const gens = parseInt(generations_count.value) || 11;
        const cap_val = parseFloat(cap.value) || 5000;

        const deducted = price * (ded_pct / 100);
        deducted_amount.value = deducted.toFixed(2);

        const c_share = deducted * (com_pct / 100);
        company_share.value = c_share.toFixed(2);

        const m_pct = 100 - com_pct;
        members_percent.value = m_pct.toFixed(2);

        const m_share = deducted - c_share;
        members_share.value = m_share.toFixed(2);

        const def_total = Math.pow(2, gens) - 1;
        default_total_members.value = def_total;

        let share = 0;
        if (gens > 0) share = m_share / gens;
        if (share > cap_val) share = cap_val;
        share_per_member.value = share.toFixed(2);

        // --- 2. Calculate Table & Totals ---

        let sum_right = 0;
        let sum_left = 0;
        let sum_total_members = 0;
        let sum_tree_income = 0;

        // Arrays for summing columns
        let col_no_stopper = 0;
        let col_with_stopper = 0;
        let col_bottom_up = 0;

        // Stopper Logic Constants
        // Stopper Depth = (Generations - 1) i.e. current + 10 = 11 levels total
        const limit_depth = gens - 1;

        tableState.forEach((row, i) => {
            const gen = i + 1;

            // 1. Total Members in this Gen
            let gen_total_members = 0;
            if (gen === 1) {
                gen_total_members = 1;
                // Force display inputs to 0 for root if logic assumes
                // But user might want to edit. We stick to state.
            } else {
                gen_total_members = row.r + row.l;
            }

            // 2. Income for this Gen (Total Members * Share)
            // This represents "Total Commission Paid TO this level"? 
            // NO, typically "Total Income" column in these sheets means "Revenue from this level"?
            // In Python: `income = total * share_per`.
            // Which means if there are 4 people, and share is $2, total $8.
            const gen_income = gen_total_members * share;

            // 3. Advanced Columns (Theoretical Balanced Tree Logic)

            // Calculate Depth Remaining for this generation in the theoretical tree
            // If we are at Gen `gen`, and the tree goes up to `gens` input.
            // Depth = gens - gen.
            // Example: Gens=11. At Gen 1, depth=10. At Gen 11, depth=0. At Gen 12, depth=-1 (Out of tree).

            let rem_depth = gens - gen;
            if (rem_depth < 0) rem_depth = -1; // Outside the official "Company Tree"

            // Subtree Size (Balanced)
            // Size of a binary tree with depth `d` = 2^(d+1) - 1.
            // Includes self.
            let subtree_size = 0;
            if (rem_depth >= 0) {
                subtree_size = Math.pow(2, rem_depth + 1) - 1;
            }

            // Subtree Size Limited (Stopper)
            // Effective depth = min(rem_depth, limit_depth)
            let effective_depth = -1;
            if (rem_depth >= 0) {
                effective_depth = Math.min(rem_depth, limit_depth);
            }

            let subtree_size_limited = 0;
            if (effective_depth >= 0) {
                subtree_size_limited = Math.pow(2, effective_depth + 1) - 1;
            }

            // Bottom Up Count
            // min(gen, gens) -- Wait, Python logic used `min(member.generation, generations)`
            // If Gen=1, min(1, 11) = 1.
            // If Gen=5, min(5, 11) = 5.
            // If Gen=20, min(20, 11) = 11.
            const bottom_up_count = Math.min(gen, gens);


            // Calculate Aggregates for the Row (All members in this gen)
            // Python logic: Sum of (OneMemberCalc * Share) for all members.
            // Since we assume uniform members in this gen (or simply sum them up):
            // RowValue = NumMembersInGen * PerMemberValue

            // Valid only if members are inside the generations count?
            // Usually commissions are calculated for everyone who exists.
            // If Gen 15 exists, do they get paid? Yes, based on their subtree (which might be 0 if max gen is 11?).
            // No, `rem_depth < 0` implies they have no team inside the company 11 generations?
            // Actually, usually a member at Gen 100 still draws from 11 levels below him.
            // BUT, strictly following Python code:
            // "get_team_size_with_limit(generations-1)"
            // It builds tree. The tree in python is infinite/dynamic.
            // Here we limit by `gens`. 
            // LET'S ASSUME: The "Company Tree" ends at `gens`.
            // So a member at Gen 11 has NO team (0).
            // A member at Gen `gens` has 0 subtree?
            // `rem_depth = gens - gen`. If gen=11, gens=11 -> rem=0.
            // `subtree_size` = 2^1 - 1 = 1 (Himself).
            // Logic seems consistent: last gen has only themselves.

            const row_comm_no_stopper = gen_total_members * subtree_size * share;
            const row_comm_with_stopper = gen_total_members * subtree_size_limited * share;
            const row_comm_bottom_up = gen_total_members * bottom_up_count * share;

            // Updates
            sum_right += row.r;
            sum_left += row.l;
            sum_total_members += gen_total_members;
            sum_tree_income += gen_income;

            col_no_stopper += row_comm_no_stopper;
            col_with_stopper += row_comm_with_stopper;
            col_bottom_up += row_comm_bottom_up;

            // Update DOM
            document.getElementById(`row-${i}-col-0`).innerText = gen_total_members; // Total
            document.getElementById(`row-${i}-col-1`).innerText = gen_income.toFixed(2); // First Person Income? Label says "Commissions of First Person" -> This maps to Python col 'income'? Python 'income' is just `total * share`.

            document.getElementById(`row-${i}-col-2`).innerText = row_comm_no_stopper.toFixed(2);
            document.getElementById(`row-${i}-col-3`).innerText = row_comm_with_stopper.toFixed(2);
            document.getElementById(`row-${i}-col-4`).innerText = row_comm_bottom_up.toFixed(2);
        });

        // --- 3. Final Footer Updates ---
        total_right_el.innerText = sum_right;
        total_left_el.innerText = sum_left;
        total_members_el.innerText = sum_total_members;
        total_income_el.innerText = sum_tree_income.toFixed(2);

        total_comm_no_stopper_el.innerText = col_no_stopper.toFixed(2);
        total_comm_with_stopper_el.innerText = col_with_stopper.toFixed(2);
        total_comm_bottom_up_el.innerText = col_bottom_up.toFixed(2);

        // --- 4. Final Outputs Cards ---
        // 1. Allocated (Total Members in Tree * Share of Plan)
        // Note: Python uses Total Members from the sum column * members_share (the global variable).
        const total_allocated = sum_total_members * m_share;
        total_income_plan_el.innerText = total_allocated.toFixed(2);

        // 2. Distributed (The 'With Stopper' Total)
        total_distributed_el.innerText = col_with_stopper.toFixed(2);

        // 3. Validation (Allocated - Distributed)
        const val_diff = total_allocated - col_with_stopper;
        validation_check_el.innerText = val_diff.toFixed(2);

        if (val_diff < -0.1) {
            validation_card.className = 'output-card warning';
        } else {
            validation_card.className = 'output-card padding'; // or valid style
            // Let's keep it blue or green if valid
            validation_card.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
        }
    }

    // Initialize
    initTableState();
    renderTableRows();
    calculateAll();
});
