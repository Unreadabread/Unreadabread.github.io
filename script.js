let game = document.getElementById('game'), text = document.getElementById('text'), city = document.getElementById('city'), can = document.getElementById('can')
const defHTML = game.innerHTML
const flags = {
    holding: false, shuffling: false, mixed: false,
    total: 0, durability: 0
}
const ranks = [
    { score: 10000, text: 'えぐみ限界突破してる', color: 'gold' },
    { score: 7000, text: 'ヤバみあふれてる', color: 'blueviolet' },
    { score: 4000, text: 'いい感じ', color: 'darkcyan' },
    { score: 2000, text: 'よき', color: 'darkgray' },
    { score: -1, text: 'orz', color: undefined }
]

function onLoad() {
    text = document.getElementById('text'), city = document.getElementById('city'), can = document.getElementById('can')
    var movement = 0
    can.addEventListener('mousedown', onDown)
    can.addEventListener('touchstart', event => {
        event.preventDefault()
        movement = 0
        onDown()
    }, false)
    game.addEventListener('mousemove', event => onMove(event.clientY, event.movementY))
    game.addEventListener('touchmove', event => {
        if (flags.shuffling) {
            event.preventDefault()
            const touch = event.changedTouches[0]
            onMove(touch.clientY, movement - touch.clientY)
            movement = touch.clientY   
        }
    }, false)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchend', event => {
        if (flags.shuffling) event.preventDefault()
        onUp()
    })
    
}

function onDown() {
    flags.holding = true
    if (!flags.mixed && !flags.shuffling) {
        text.textContent = ''
        text.style.animation = 'none'
        text.style.color = 'darkslategray'

        var second = 10
        const id = setInterval(() => {
            text.textContent = --second
            if (second == 0) {
                clearInterval(id)
                finish()
            }
        }, 1000)
        flags.shuffling = true
    }
}

function onMove(y = 0, move = 0) {
    if (flags.holding && flags.shuffling) {
        flags.total += Math.abs(Math.floor(move / 10))

        let gameHeight = game.clientHeight / 2
        can.style.transform = 'translateY(' + Math.min(Math.max(y - 325, -gameHeight), gameHeight - can.clientHeight) + 'px)'

        if (flags.durability == 0 && flags.total >= 3000) {
            let texture = can.lastElementChild
            texture.setAttribute('xlink:href', './img/can.svg#1')
            can.setAttribute('viewBox', '0 0 346.79 464.42')
            flags.durability++
        }
    }
}

function onUp() {
    if (flags.shuffling) {
        flags.holding = false
        can.style.transform = null
    }
}

function finish() {
    flags.shuffling = false
    flags.mixed = true

    text.textContent = '時間切れ'
    text.style.transition = 'color 0.5s ease'
    setTimeout(() => {
        can.style.transition = 'all 0.5s ease-in-out'
        can.style.transform = 'translateY(100px) scale(85%) rotate(180deg)'
        text.style.color = 'rgba(0, 0, 0, 0)'

        setTimeout(splash, 1500)
    }, 3000)
}

function splash() {
    city.animate([{ transform: 'translateY(60%) scaleY(0%)' }], { duration: 1000, easing: 'ease-out', fill: 'forwards' })
    text.style.color = 'darkslategray'

    let score = -1
    const id = setInterval(() => {
        text.textContent = '記録: ' + ++score + 'm'

        if (score < flags.total) for (let i = 0; i < ranks.length; i++) {
            const rank = ranks[i];
            if (score == rank.score) {
                text.style.color = rank.color
                break
            }
        } else {
            clearInterval(id)
            can.style.transform = 'translate(-50%, 200%) scale(0%) rotate(3600deg)'

            setTimeout(() => {
                for (let i = 0; i < ranks.length; i++) {
                    const rank = ranks[i];
                    if (flags.total >= rank.score) {
                        text.textContent += ' ' + rank.text
                        break
                    }
                }

                const replay = document.createElement('p')
                replay.textContent = 'やり直す？'
                replay.id = "replay"
                replay.ontouchstart = replay.onmousedown = flesh

                game.append(replay)
            }, 1000)
        }
    }, 1);
}

function flesh(event) {
    event.stopPropagation()
    game.innerHTML = defHTML
    onLoad()
    flags.holding = flags.shuffling = flags.mixed = flags.total = flags.durability = 0
}

/**
<svg viewBox="0 0 512 324.82">
    <path d="M438.32,202.22C426.79,140.52,372.4,93.59,307.51,93.59A133,133,0,0,0,186.9,170.31,113.94,113.94,0,0,0,91.82,334.4L56.61,366.6,0,418.41H416.72L418,417a111.34,111.34,0,0,0,20.36-214.77ZM403.26,388.47l-.12.13H76.74l53.87-49.3A84.12,84.12,0,0,1,194,199.9,84.78,84.78,0,0,1,207.46,201,103.29,103.29,0,0,1,410.78,226.1a81.52,81.52,0,0,1-7.52,162.37Z" transform="translate(0 -93.59)"/>
</svg>         
<svg viewBox="0 0 512 365.2">
    <path d="M512,262.56l-104.24,14.1L450.82,87.13,295.47,213.18,199.62,73.4,164.11,232.2,8,164.07,110.14,361.51,0,438.6H488.09l-42.41-64.49ZM397.26,415l-23.1-24.88,39.29-62.86-76,13.1,19.65-93L286.42,322,235.35,247.4l-11.79,90.36-86.43-47.15L188.2,384.9,129.84,415h-55l65.75-46L59.43,212.25l121.45,53,29.93-133.84,79.66,116.18,122.27-99.19-35.5,156.18,89.57-12.09-48.92,82.27L444.37,415Z" transform="translate(0 -73.4)"/>
</svg>
*/