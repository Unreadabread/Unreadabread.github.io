import * as THREE from 'three'
import { SVGLoader } from 'three/loaders/SVGLoader.js'
import { FontLoader } from 'three/loaders/FontLoader.js'
import { TextGeometry } from 'three/geometries/TextGeometry.js'

const _fontLoader = new FontLoader(), _svgLoader = new SVGLoader(), _raycaster = new THREE.Raycaster(), _boundingBox = new THREE.Box3()
const _scene = new THREE.Scene(), _camera = new THREE.OrthographicCamera()

const GAME = { canY: null, pressed: false, entered: false, score: null, speed: 0, velocity: 0, closed: false, timeCount: 3, lastTime: 0, lastPressed: false, ground: false, splashed: false, shownReset: false }
const DEF_GAME = { ...GAME }
const TEMP = { font: null, label: null, can: null, city: null, resetButton: null, canvasHeight: 480, center: 125, aspect: 0 }
const COLORS = { darkslategray: 0x2f4f4f, whitesmoke: 0xf5f5f5, darkgray: 0xa9a9a9, darkcyan: 0x008b8b, blueviolet: 0x8a2be2, gold: 0xffd700 }
const RANKS = {
    0: {text: 'orz', color: COLORS.darkslategray },
    2000: {text: 'よき', color: COLORS.darkgray },
    4000: {text: 'いい感じ', color: COLORS.darkcyan },
    7000: {text: 'ヤバみあふれてる', color: COLORS.blueviolet },
    10000: {text: 'えぐみ限界突破してる', color: COLORS.gold },
}
const TEXTS = [ 'ドラッグパットでやってみません？', '縦長モニターが欲しい', 'ズームしたって無駄です！', 'ミックスで振ってドラッグ！', 'こんニシン！', '大空に羽ばたく缶…', '投げすぎるのもいカンでしょ' ]

const $ = id => document.getElementById(id)

const _loadFont = async url => await new Promise((resolve, reject) => _fontLoader.load(url, resolve, undefined, reject))

const _loadSVG = async (url, color, opacity = undefined) => await new Promise((resolve, reject) => _svgLoader.load(url, ({paths}) => {
    const group = new THREE.Group()
    group.name = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))
    group.scale.y = -1
    for (const path of paths) {
        const style = path.userData.style
        const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, depthWrite:  false, color: style.fill != '#000' ? style.fill : color, opacity: opacity != undefined ? opacity : style.fillOpacity })
        for (const shape of SVGLoader.createShapes(path)) {
            group.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), material))
        }
    }
    resolve(group)
}, undefined, reject))

const _intersectObjects = (canvas, x, y, objects) => {
    const rect = canvas.getBoundingClientRect()
    _raycaster.setFromCamera(new THREE.Vector2(
        ((x - rect.left) / (rect.right - rect.left)) * 2 - 1,
        -((y - rect.top) / (rect.bottom - rect.top)) * 2 + 1
    ), _camera)
    return _raycaster.intersectObjects(objects)
}

const _getCanPosition = y => -(y - TEMP.canvasHeight - GAME.canY / 2)

const _resizeCamera = (width, height) => {
    _camera.left   = width  / -2
    _camera.right  = width  /  2
    _camera.top    = height /  2
    _camera.bottom = height / -2
    _camera.updateProjectionMatrix()
}

const _normalizeText = (text, meshOrParams, size = 30) => {
    const geometry = new TextGeometry(text, {font: TEMP.font, size: size, height: 1})
    geometry.computeBoundingBox()
    const mesh = meshOrParams.geometry instanceof TextGeometry ? meshOrParams : new THREE.Mesh(geometry, new THREE.MeshBasicMaterial(meshOrParams))
    if (mesh == meshOrParams) mesh.geometry.copy(geometry)
    mesh.position.x = (geometry.boundingBox.max.x - geometry.boundingBox.min.x) / -2
    return mesh
}

const _setLabel = (text, color, size) => {
    if (text) _normalizeText(text, TEMP.label, size)
    if (color) TEMP.label.material.color.set(color)
}

const _getText = () => Math.random() > 0.1 ? 'ドラッグで振ってミックス！' : TEXTS[parseInt(Math.random() * TEXTS.length)]

const _getRank = score => Object.entries(RANKS).reverse().find(entry => entry[0] <= score)[1]

// ↑ いい感じのUtil的なもの ↑ =============== ↓ 肝心の中身的なもの ↓ =================================================

window.addEventListener('DOMContentLoaded', async () => {
    await load()
    init()
    setup()
    console.log( // ちょっとしたお遊び。
        "   ,_|__, -,,- L__\\ .               ,      .               ,\n",
        "  ,----- ,｣L. / L' |            --|-.  \\  |            --|-.  \\\n",
        " | \\ | / |｣L|  ,_. |              /  \\  \\ |              /  \\  \\\n",
        " |  ,^､  |--| /\\/  |    , _\\-^､  /    | ’ |    , _\\-^､  /    | ’\n",
        "/  /   \\ |--|  /\\  \\___/    \\ ’ /  \\_/    \\___/    \\ ’ /  \\_/\n",
        "==================== create by Unreadabread ===================="
	)
})

async function load() {
    TEMP.font = await _loadFont('/public/corporate_logo_bold.json')
    TEMP.can = await _loadSVG('/public/can/can.svg', COLORS.darkslategray)
    TEMP.city = await _loadSVG('/public/can/city.svg', COLORS.darkslategray, 0.75)
}

function init() {
    // label
    TEMP.label = _normalizeText(_getText(), { color: COLORS.darkslategray, transparent: true })
    TEMP.label.position.y = TEMP.center + 100
    TEMP.label.addEventListener('render', event => {
        if (GAME.score == null || GAME.splashed) {
            const opacity = event.time % 5000 / 5000
            TEMP.label.material.opacity = opacity <= 0.5 ? 1 - opacity : opacity
        }
    })

    // can
    _boundingBox.setFromObject(TEMP.can)
    TEMP.can.position.set((_boundingBox.max.x - _boundingBox.min.x) / -2, TEMP.center, 1)
    TEMP.can.position.set(-30, TEMP.center, 1)
    TEMP.can.scale.set(0.2, -0.2, 0.2)
    TEMP.can.addEventListener('mousedown', event => {
        GAME.canY = TEMP.can.position.y
        TEMP.can.position.y = _getCanPosition(event.y)

        if (GAME.score == null) {
            GAME.score = 0
            TEMP.label.material.opacity = 1
        }
    })
    window.addEventListener('mousemove', event => {
        if (GAME.score == null || GAME.canY == null) return

        const calc = _getCanPosition(event.clientY), movement = Math.abs(TEMP.can.position.y - calc) / 10
        TEMP.can.position.y = calc

        if (!GAME.closed) GAME.score += movement
        // else if (GAME.velocity >= 0 && 0 > movement || 0 > GAME.velocity && movement >= 0) GAME.velocity = movement
        else GAME.velocity = movement
    })
    window.addEventListener('mouseup', () => {
        if (GAME.canY == null) return
        if (!GAME.closed) TEMP.can.position.y = GAME.canY
        else GAME.speed = GAME.velocity
        GAME.canY = null
    })
    TEMP.can.addEventListener('render', event => {
        if (GAME.score == null) return
        if (!GAME.closed) {
            if (event.time - GAME.lastTime <= 1000) return
            GAME.lastTime = event.time

            // 時間を数えたり、時間切れになるところ
            if (GAME.timeCount > 0) _setLabel(`${GAME.timeCount--}`)
            else if (GAME.timeCount == 0) {
                _setLabel('上にスワイプ！')
                GAME.closed = true
                GAME.lastPressed = GAME.canY != null // 押してる最中ならtrueになります
            }
        } else if (!GAME.splashed) {
            // 5秒以内に押せばギリギリなんとかできます
            // それでも押さなければ勝手に飛んでいきます
            if (!GAME.lastPressed) GAME.lastPressed = event.time - GAME.lastTime > 5000 || GAME.canY != null
            else if (GAME.canY == null) {
                // 缶が投げられるところ
                if (!GAME.ground) {
                    GAME.speed -= 0.1
                    TEMP.can.position.y += GAME.speed

                    if (Math.abs(GAME.speed) > 10) GAME.score += Math.abs(GAME.speed) / 10

                    if (0 >= TEMP.can.position.y) {
                        TEMP.can.position.y = 0
                        GAME.ground = true
                    }
                } else {
                    // 上に吹っ飛ぶところ
                    TEMP.can.position.y += GAME.score / 100

                    if (TEMP.can.position.y >= GAME.score) {
                        TEMP.can.position.y = GAME.score
                        GAME.lastTime = event.time
                        GAME.splashed = true
                    }

                    _setLabel(`${Math.floor(TEMP.can.position.y)}m`, _getRank(TEMP.can.position.y).color)
                }

                if (TEMP.can.position.y >= TEMP.center) {
                    _camera.position.y = TEMP.can.position.y
                    TEMP.label.position.y = _camera.position.y + 100
                } else {
                    _camera.position.y = TEMP.center
                    TEMP.label.position.y =TEMP.center + 100
                }
            }
        } else {
            // 缶が飛び終わって落ちるところ
            if (event.time - GAME.lastTime <= 2000) {
                const time = event.time - GAME.lastTime
                if (TEMP.can.position.y > 0) {
                    TEMP.can.position.y -= time / (time > 1000 ? 50000 : 5000) * TEMP.canvasHeight
                    if (GAME.score > TEMP.center) TEMP.can.rotation.z = time / 3000 * Math.PI
                }
                if (TEMP.can.position.y < 0) TEMP.can.position.y = 0
                return
            }
            if (GAME.shownReset) return
            
            // やり直すボタンが出るところ
            _setLabel(`記録: ${Math.floor(GAME.score)}m\n評価: ${_getRank(GAME.score).text}`, undefined, 20)
            TEMP.resetButton.position.y = _camera.position.y
            _scene.add(TEMP.resetButton)
            GAME.shownReset = true
        }
    })

    // city
    _boundingBox.setFromObject(TEMP.city)
    TEMP.city.position.x = (_boundingBox.max.x - _boundingBox.min.x) / -2

    // canvas(can/resetButton のクリック、ホバーイベントの発火)
    const canvas = $('game')
    canvas.addEventListener('mousedown', event => {
        const object = !GAME.lastPressed ? TEMP.can : GAME.shownReset ? TEMP.resetButton : null
        if (object && _intersectObjects(canvas, event.clientX, event.clientY, [ object ]).length) {
            object.dispatchEvent({ type: 'mousedown', target: object, y: event.clientY })
        }
    })
    canvas.addEventListener('mousemove', event => {
        if (!GAME.shownReset || _intersectObjects(canvas, event.clientX, event.clientY, [ TEMP.resetButton ]).length != GAME.entered) return
        TEMP.resetButton.dispatchEvent({ type: GAME.entered ? 'mouseenter' : 'mouseleave', target: TEMP.resetButton })
        GAME.entered = !GAME.entered
    })

    // resetButton
    TEMP.resetButton = _normalizeText('やり直す？', { color: COLORS.darkslategray, transparent: true }, 20)
    TEMP.resetButton.position.set(TEMP.resetButton.position.x, 0, 2)
    const boundingBox = TEMP.resetButton.geometry.boundingBox
    
    // 後ろのうっすら出てくるところ
    const button = new THREE.Mesh(new THREE.CapsuleGeometry(40, 200, 4, 2), new THREE.MeshBasicMaterial({ color: COLORS.darkslategray, transparent: true, opacity: 0 }))
    button.position.set(-TEMP.resetButton.position.x, (boundingBox.max.y - boundingBox.min.y) / 2, 2)
    button.rotation.set(Math.PI / 2, 0, Math.PI / 2)
    TEMP.resetButton.add(button)

    // ホバー関係
    TEMP.resetButton.addEventListener('mouseenter', () => {
        canvas.style.cursor = 'pointer'
        TEMP.resetButton.material.opacity = 0.75
        button.material.opacity = 0.25
    })
    TEMP.resetButton.addEventListener('mouseleave', () => {
        canvas.style.cursor = 'default'
        TEMP.resetButton.material.opacity = 1
        button.material.opacity = 0
    })
    // ここで起動時の状態に戻します。
    TEMP.resetButton.addEventListener('mousedown', () => {
        canvas.style.cursor = 'default'
        _scene.remove(TEMP.resetButton)
        // TEMP.resetButton.position.y = 0 // _scene.removeしちゃうってことは〜、表示される前に調整しちゃえばいいわけで〜、これいらないってわけ〜
        Object.assign(GAME, DEF_GAME)
        _setLabel(_getText(), COLORS.darkslategray)
        TEMP.can.position.y = TEMP.center
        TEMP.can.rotation.z = 0
        _camera.position.y = TEMP.center
        TEMP.label.position.y = TEMP.center + 100
    })
}
    
// ゲームとは関係ない、描画系のところ。
function setup() {
    const canvas = $('game')

    // scene
    _scene.add(TEMP.label, TEMP.can, TEMP.city)

    // camera
    const width = canvas.parentElement.clientWidth
    TEMP.aspect = width / TEMP.canvasHeight
    _resizeCamera(width, TEMP.canvasHeight)
    _camera.position.set(0, TEMP.center, 10)

    // renderer
    const renderer = new THREE.WebGLRenderer({ 'canvas': canvas, 'alpha': true, 'antialias': true })
    renderer.setSize(width, TEMP.canvasHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setAnimationLoop(time => {
        const width = canvas.parentElement.clientWidth
        if (TEMP.aspect != width / TEMP.canvasHeight) {
            TEMP.aspect = width / TEMP.canvasHeight
            _resizeCamera(width, TEMP.canvasHeight)
        }

        for (const child of _scene.children) child.dispatchEvent({ type: 'render', target: child, time: time })
        renderer.render(_scene, _camera)
    })
    window.addEventListener('resize', () => {
        const width = canvas.parentElement.clientWidth
        _resizeCamera(width, TEMP.canvasHeight)
        renderer.setSize(width, TEMP.canvasHeight)
    })
}

// ;(async () => {
//     const font = await _loadFont('/public/corporate_logo_bold.json')

//     const text = new TextGeometry('やり直す？', { font: font, size: 20, height: 1 })
//     text.computeBoundingBox()
//     const label = new THREE.Mesh(text, new THREE.MeshBasicMaterial({ color: _darkslategray, transparent: true }))
//     label.position.x = (text.boundingBox.max.x - text.boundingBox.min.x) / 2

//     const button = new THREE.Mesh(new THREE.CapsuleGeometry(40, 200, 4, 2), new THREE.MeshBasicMaterial({ color: _darkslategray, transparent: true, opacity: 0 }))
//     button.position.copy(label.position).setY((text.boundingBox.max.y - text.boundingBox.min.y) / 2)
//     button.rotation.set(Math.PI / 2, 0, Math.PI / 2)
//     label.add(button)

//     const canvas = document.createElement('canvas')
//     document.getElementsByTagName('main')[0].appendChild(canvas)

//     const scene = new THREE.Scene().add(label)
//     scene.background = _whitesmoke
    
//     const width = canvas.clientWidth, height = canvas.clientHeight
//     const camera = new THREE.OrthographicCamera(width  / -2, width  /  2, height /  2, height / -2)
//     camera.position.set(0, 0, 10)

//     const mouse = new THREE.Vector2()
//     const raycaster = new THREE.Raycaster()

//     canvas.addEventListener('mousemove', event => {
//         const rect = canvas.getBoundingClientRect()
//         mouse.set(
//             ((event.clientX - rect.left) / (rect.right - rect.left)) * 2 - 1,
//             -((event.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1
//         )
//         raycaster.setFromCamera(mouse, camera)

//         const objects = raycaster.intersectObjects(scene.children)
//         if (objects.length) {
//             console.log(objects);
//             label.material.opacity = 0.75
//             button.material.opacity = 0.25
//         } else {
//             label.material.opacity = 1
//             button.material.opacity = 0
//         }
//     })

//     const renderer = new THREE.WebGLRenderer({ 'canvas': canvas, 'alpha': true, 'antialias': true })
//     renderer.setSize(width, height)
//     renderer.setPixelRatio(window.devicePixelRatio)
//     renderer.setAnimationLoop(time => {
//         label.position.copy(camera.position).setZ(0)

//         renderer.render(scene, camera)
//     })
// })();