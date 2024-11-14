const ids = (id) => document.getElementById(id);

function deleteMail(deleteEndpoint) {
    const selectAllCheckbox = ids('selectAll');
    selectAllCheckbox.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll('.email-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
    });

    ids('deleteBtn').addEventListener('click', async () => {
        const selectedEmails = Array
                                .from(document.querySelectorAll('.email-checkbox:checked'))
                                .map(cb => cb.dataset.emailId);
        
        if (selectedEmails.length === 0) {
            alert("Select at least one email to delete.");
            return;
        }

        const response = await fetch(deleteEndpoint, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedEmails })
        });

        if (response.ok) {
            selectedEmails.forEach(id => {
                document.querySelector(`.email-checkbox[data-email-id="${id}"]`)
                        .closest('.email-item')
                        .remove();
            });
        } else {
            alert("Failed to delete emails. Please try again.");
        }
    });
}