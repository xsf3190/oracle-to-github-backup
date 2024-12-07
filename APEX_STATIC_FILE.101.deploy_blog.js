/*
** MAKE ENTIRE CARD ELEMENTS CLICKABLE
*/
document.querySelectorAll('.card:not(:has(h1))').forEach((card) => {
    card.style.cursor = 'pointer';
    card.addEventListener("click", () => {
        card.querySelector('h2 a').click();
    });
});