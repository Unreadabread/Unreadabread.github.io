export const createOutsideContent = () => document.body.innerHTML = `<header>
<h1>Unreadabread</h1>
<a href="/can" tabindex>
    <svg height="2em" viewBox="0 0 340 512">
        <use href="/public/icon.svg#can"/>
    </svg>
    <span>炭酸しゃかしゃか</span>
</a>
${''/*
<a href="/train">
    <img src="/public/train/icon_big.png">
    <span>電車のりかえ(作り途中…)</span>
</a>
*/}</header>
${document.getElementsByTagName('main')[0].outerHTML}
<footer>
<a href="https://github.com/Unreadabread/Unreadabread.github.io" target="_blank" rel="noopener noreferrer" tabindex>
    <svg viewBox="0 0 512 512" style="height: 1rem;">
        <use href="/public/icon.svg#source"/>
    </svg>
    GITHUB
</a>
</footer>`