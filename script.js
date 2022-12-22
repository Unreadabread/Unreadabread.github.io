const content = document.getElementById('content')
const cola = document.getElementById('cola')
let isShuffle = false, mixed = false
let timerId = -1, total = 0

content.addEventListener('mousedown', event => {
    if (!mixed) {
        content.setAttribute('flag', 'mix')
        if (timerId == -1) timerId = setTimeout(finish, 10000)
        isShuffle = true
    }
})

content.addEventListener('mousemove', event => {
    if (isShuffle) {
        total += Math.abs(Math.floor(event.movementY / 10))
        let y = Math.min(Math.max(event.clientY - 70, content.style.top), content.clientHeight - cola.clientHeight)
        cola.style.top = '0'
        cola.style.transform = 'translate(-50%, ' + y + 'px)'
    }
})

document.addEventListener('mouseup', event => {
    if (isShuffle) {
        isShuffle = false
        cola.style.top = '50%'
        cola.style.transform = 'translate(-50%, -50%)'
    }
})

function finish() {
    isShuffle = false
    mixed = true
    content.setAttribute('flag', 'finish')
    setTimeout(() => {
        cola.style.transition = 'all 0.5s ease-in-out'
        cola.style.top = '50%'
        cola.style.transform = 'translate(-50%, 100%) scale(85%) rotate(180deg)'
        setTimeout(splash, 1500)
    }, 3000)
}

function splash() {
    /**
    let path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M438.32,202.22C426.79,140.52,372.4,93.59,307.51,93.59A133,133,0,0,0,186.9,170.31,113.94,113.94,0,0,0,91.82,334.4L56.61,366.6,0,418.41H416.72L418,417a111.34,111.34,0,0,0,20.36-214.77ZM403.26,388.47l-.12.13H76.74l53.87-49.3A84.12,84.12,0,0,1,194,199.9,84.78,84.78,0,0,1,207.46,201,103.29,103.29,0,0,1,410.78,226.1a81.52,81.52,0,0,1-7.52,162.37Z')
    path.setAttribute('transform', 'translate(0 -93.59)')
    let cloud = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    cloud.setAttribute('id', 'cloud')
    cloud.setAttribute('viewBox', '0 0 512 324.82')
    let random = Math.floor(Math.random() * 50) + 1
    cloud.setAttribute('height', random + '%')
    cloud.appendChild(path)
    content.appendChild(cloud)
    */
    
    let text = document.createElement('p')
    text.id = 'score'
    content.appendChild(text)
    content.setAttribute('flag', 'splash')
    document.getElementById('city').style.transform = 'translateY(0) scaleY(0%)'
    let score = 0
    let id = setInterval(() => {
        text.textContent = 'Score: ' + score
        if (score >= 3000) {
            content.setAttribute('flag', 'perfect')
        } else if (score >= 2000) {
            content.setAttribute('flag', 'great')
        } else if (score >= 1000) {
            content.setAttribute('flag', 'good')
        }
        if (score >= total) {
            clearInterval(id)
            cola.style.transform = 'translate(-50%, 200%) scale(0%) rotate(3600deg)'
            if (total < 2000) {
                setTimeout(() => {
                    content.setAttribute('flag', 'omg')
                }, 1000)
            }
            return
        } else {
            score++
        }
    }, 5);
}

/**
        svg viewBox="0 0 512 324.82">
            <path d="M438.32,202.22C426.79,140.52,372.4,93.59,307.51,93.59A133,133,0,0,0,186.9,170.31,113.94,113.94,0,0,0,91.82,334.4L56.61,366.6,0,418.41H416.72L418,417a111.34,111.34,0,0,0,20.36-214.77ZM403.26,388.47l-.12.13H76.74l53.87-49.3A84.12,84.12,0,0,1,194,199.9,84.78,84.78,0,0,1,207.46,201,103.29,103.29,0,0,1,410.78,226.1a81.52,81.52,0,0,1-7.52,162.37Z" transform="translate(0 -93.59)"/>
        </svg>         
        <svg viewBox="0 0 512 365.2">
            <path d="M512,262.56l-104.24,14.1L450.82,87.13,295.47,213.18,199.62,73.4,164.11,232.2,8,164.07,110.14,361.51,0,438.6H488.09l-42.41-64.49ZM397.26,415l-23.1-24.88,39.29-62.86-76,13.1,19.65-93L286.42,322,235.35,247.4l-11.79,90.36-86.43-47.15L188.2,384.9,129.84,415h-55l65.75-46L59.43,212.25l121.45,53,29.93-133.84,79.66,116.18,122.27-99.19-35.5,156.18,89.57-12.09-48.92,82.27L444.37,415Z" transform="translate(0 -73.4)"/>
        </svg>
*/