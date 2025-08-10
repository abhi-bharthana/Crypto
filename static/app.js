document.addEventListener('DOMContentLoaded', () => {
    const transactionForm = document.getElementById('transaction-form');
    const mineButton = document.getElementById('mine-button');
    const blockchainContainer = document.getElementById('blockchain');

    const fetchChain = async () => {
        const response = await fetch('/chain');
        const data = await response.json();
        blockchainContainer.textContent = JSON.stringify(data, null, 2);
    };

    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sender = e.target.sender.value;
        const recipient = e.target.recipient.value;
        const amount = e.target.amount.value;

        await fetch('/transactions/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sender, recipient, amount })
        });

        e.target.reset();
        alert('Transaction created successfully!');
    });

    mineButton.addEventListener('click', async () => {
        await fetch('/mine');
        fetchChain();
        alert('New block mined!');
    });

    fetchChain();
});
