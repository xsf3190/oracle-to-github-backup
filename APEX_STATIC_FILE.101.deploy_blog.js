/*
** MAKE ENTIRE CARD ELEMENTS CLICKABLE
*/
document.querySelectorAll('.card').forEach((card) => {
    card.style.cursor = 'pointer';
    card.addEventListener("click", () => {
        card.querySelector('h2 a').click();
    });
});