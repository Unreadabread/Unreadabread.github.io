import {
    Raycaster, DoubleSide, Box3, Vector2,
    WebGLRenderer, Scene, OrthographicCamera,
    Group, Mesh, MeshBasicMaterial, ShapeGeometry, CapsuleGeometry, GridHelper, Color
} from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'

const _fontLoader = new FontLoader(), _svgLoader = new SVGLoader(), _raycaster = new Raycaster(), _boundingBox = new Box3()
const _scene = new Scene(), _camera = new OrthographicCamera()

// やり直す時に初期化される変数
const GAME = { canY: null, pressed: false, entered: false, score: null, speed: 0, velocity: 0, closed: false, timeCount: 10, lastTime: 0, lastPressed: false, ground: false, splashed: false, shownReplay: false }

// 読み込まれた後からあまり変わらない変数
const TEMP = { canvas: null, font: null, label: null, can: null, city: null, replay: null, default: { ...GAME }, canvasSize: new Vector2(0, 480), center: 125, aspect: 0, record: [] }

// 色。
const COLOR = {
    darkslategray: new Color('darkslategray'),
    whitesmoke: new Color('whitesmoke'),
    darkgray: new Color('darkgray'),
    darkcyan: new Color('darkcyan'),
    blueviolet: new Color('blueviolet'),
    gold: new Color('gold')
}

// 高さに応じて色々褒めるやつ
const RANK = {
    0: { text: 'orz', color: COLOR.darkslategray },
    2000: { text: 'よき', color: COLOR.darkgray },
    4000: { text: 'いい感じ', color: COLOR.darkcyan },
    7000: { text: 'ヤバみあふれてる', color: COLOR.blueviolet },
    10000: { text: 'えぐみ限界突破してる', color: COLOR.gold },
}

// ごく稀に入れ替わる最初の文字のやつ
const TEXTS = [ 'ドラッグパットでやってみません？', '縦長モニターが欲しい', 'ズームしたって無駄です！', 'ズームアウトしても無駄です！', 'ミックスで振ってドラッグ！', '大空に羽ばたく缶…', '投げすぎるのもいカンでしょ' ]

// 読み込み
const _loadFont = async url => await new Promise((resolve, reject) => _fontLoader.load(url, resolve, undefined, reject))

const _loadSVG = async (url, color, opacity = undefined) => await new Promise((resolve, reject) => _svgLoader.load(url, ({paths}) => {
    const group = new Group()
    group.name = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'))
    group.scale.y = -1
    for (const path of paths) {
        const style = path.userData.style
        const material = new MeshBasicMaterial({ side: DoubleSide, transparent: true, depthWrite:  false, color: style.fill != '#000' ? style.fill : color, opacity: opacity != undefined ? opacity : style.fillOpacity })
        for (const shape of SVGLoader.createShapes(path)) {
            group.add(new Mesh(new ShapeGeometry(shape), material))
        }
    }
    resolve(group)
}, undefined, reject))

const _intersectObjects = (x, y, objects) => {
    const rect = TEMP.canvas.getBoundingClientRect()
    _raycaster.setFromCamera(new Vector2(((x - rect.left) / (rect.right - rect.left)) * 2 - 1, -((y - rect.top) / (rect.bottom - rect.top)) * 2 + 1), _camera)
    return _raycaster.intersectObjects(objects)
}

const _getCanPosition = y => Math.max(-12.5, Math.min(365.5, -(y - TEMP.canvasSize.y - GAME.canY / 2))) // かなりゴリ押しです。

const _resizeCamera = () => {
    _camera.left   = TEMP.canvasSize.x  / -2
    _camera.right  = TEMP.canvasSize.x  /  2
    _camera.top    = TEMP.canvasSize.y /  2
    _camera.bottom = TEMP.canvasSize.y / -2
    _camera.updateProjectionMatrix()
}

const _setText = (text, meshOrParams, size = 30) => {
    const geometry = new TextGeometry(text, {font: TEMP.font, size: size, height: 1})
    geometry.computeBoundingBox()

    const mesh = meshOrParams instanceof Mesh && meshOrParams.geometry instanceof TextGeometry ? function() {
        meshOrParams.geometry.copy(geometry)
        return meshOrParams
    }() : new Mesh(geometry, new MeshBasicMaterial(meshOrParams))

    mesh.position.x = (geometry.boundingBox.max.x - geometry.boundingBox.min.x) / -2
    return mesh
}

const _setLabel = (text, color, size) => {
    if (text) _setText(text, TEMP.label, size)
    if (color) TEMP.label.material.color.set(color)
}

const _getText = () => Math.random() > 0.1 ? 'ドラッグで振ってミックス！' : TEXTS[parseInt(Math.random() * TEXTS.length)]

const _getRank = score => Object.entries(RANK).reverse().find(entry => entry[0] <= score)[1]

// ↑ いい感じのUtil的なもの ↑ =============== ↓ 肝心の中身的なもの ↓ =================================================

window.addEventListener('DOMContentLoaded', async function launch(root = true) {
    try {
        TEMP.canvas = document.getElementById('game')
        TEMP.canvasSize.x = TEMP.canvas.parentElement.clientWidth

        await load()
        init()
        setup()
    } catch (exception) {
        console.error(exception)
        // もう一回チャンスをください
        if (root) await launch(false)
    }
    
    if (root) console.log( // ちょっとしたお遊び。
        "   ,_|__, -,,- L__\\ .               ,      .               ,\n",
        "  ,----- ,｣L. / L' |            --|-.  \\  |            --|-.  \\\n",
        " | \\ | / |｣L|  ,_. |              /  \\  \\ |              /  \\  \\\n",
        " |  ,^､  |--| /\\/  |    , _\\-^､  /    | ’ |    , _\\-^､  /    | ’\n",
        "/  /   \\ |--|  /\\  \\___/    \\ ’ /  \\_/    \\___/    \\ ’ /  \\_/\n",
        "==================== create by Unreadabread ===================="
    )
})

async function load() {
    TEMP.canvas.setAttribute('loading', '読み込み中…')

    TEMP.font = await _loadFont('/public/corporate_logo_bold.json')
    TEMP.can = await _loadSVG('/public/can/can.svg', COLOR.darkslategray)
    TEMP.city = await _loadSVG('/public/can/city.svg', COLOR.darkslategray, 0.75)
}

function init() {
    TEMP.canvas.setAttribute('loading', '初期化中…')

    // label
    TEMP.label = _setText(_getText(), { color: COLOR.darkslategray, transparent: true })
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
        // 缶を追従させるようにします。
        GAME.canY = TEMP.can.position.y
        TEMP.can.position.y = _getCanPosition(event.y)

        if (GAME.score == null) {
            GAME.score = 0
            TEMP.label.material.opacity = 1
        }
    })
    window.addEventListener('mousemove', event => {
        if (GAME.score == null || GAME.canY == null) return

        const calc = _getCanPosition(event.pageY)
        if (TEMP.can.position.y == calc) return

        const movement = Math.abs(TEMP.can.position.y - calc) / 5

        if (!GAME.closed) GAME.score += movement
        else GAME.velocity = movement
        
        TEMP.can.position.y = calc
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

                    if (Math.abs(GAME.speed) > 10) GAME.score += Math.abs(GAME.speed) / 25

                    if (0 >= TEMP.can.position.y) {
                        TEMP.can.position.y = 0
                        GAME.ground = true
                        \u0061()
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
                    TEMP.can.position.y -= time / (time > 1000 ? 50000 : 5000) * TEMP.canvasSize.y
                    if (GAME.score > TEMP.center) TEMP.can.rotation.z = time / 3000 * Math.PI
                }
                if (TEMP.can.position.y < 0) TEMP.can.position.y = 0
                return
            }
            if (GAME.shownReplay) return
            
            // やり直すボタンが出るところ
            const total = Math.floor(GAME.score)
            _setLabel(`記録: ${total}m\n評価: ${_getRank(total).text}`, undefined, 20)
            TEMP.replay.position.y = _camera.position.y
            _scene.add(TEMP.replay)
            GAME.shownReplay = true

            // ログにも残す
            TEMP.record.push({ score: total, current: true })
            document.getElementById('record').innerHTML = TEMP.record.sort((left, right) => right.score - left.score).slice(0, 5).map(result => result.current && !(result.current = false) ? `<li>${result.score}m ←今のやつ` : `<li>${result.score}m`).join('')
        }
    })

    // city
    _boundingBox.setFromObject(TEMP.city)
    TEMP.city.position.x = (_boundingBox.max.x - _boundingBox.min.x) / -2

    // canvas(can/replay のクリック、ホバーイベントの発火)
    TEMP.canvas.addEventListener('mousedown', event => {
        const object = !GAME.lastPressed ? TEMP.can : GAME.shownReplay ? TEMP.replay : null
        if (object && _intersectObjects(event.clientX, event.clientY, [ object ]).length) {
            object.dispatchEvent({ type: 'mousedown', target: object, y: event.pageY })
        }
    })
    TEMP.canvas.addEventListener('mousemove', event => {
        if (!GAME.shownReplay || _intersectObjects(event.clientX, event.clientY, [ TEMP.replay ]).length != GAME.entered) return
        TEMP.replay.dispatchEvent({ type: GAME.entered ? 'mouseenter' : 'mouseleave', target: TEMP.replay })
        GAME.entered = !GAME.entered
    })

    // replay
    TEMP.replay = _setText('やり直す？', { color: COLOR.darkslategray, transparent: true }, 20)
    TEMP.replay.position.set(TEMP.replay.position.x, 0, 2)
    const boundingBox = TEMP.replay.geometry.boundingBox
    
    // 後ろのうっすら出てくるところ
    const button = new Mesh(new CapsuleGeometry(40, 200, 4, 2), new MeshBasicMaterial({ color: COLOR.darkslategray, transparent: true, opacity: 0 }))
    button.position.set(-TEMP.replay.position.x, (boundingBox.max.y - boundingBox.min.y) / 2, 2)
    button.rotation.set(Math.PI / 2, 0, Math.PI / 2)
    TEMP.replay.add(button)

    // ホバー関係
    TEMP.replay.addEventListener('mouseenter', () => {
        TEMP.canvas.style.cursor = 'pointer'
        TEMP.replay.material.opacity = 0.75
        button.material.opacity = 0.25
    })
    TEMP.replay.addEventListener('mouseleave', () => {
        TEMP.canvas.style.cursor = 'default'
        TEMP.replay.material.opacity = 1
        button.material.opacity = 0
    })
    // ここで起動時の状態に戻します。
    TEMP.replay.addEventListener('mousedown', () => {
        TEMP.canvas.style.cursor = 'default'
        _scene.remove(TEMP.replay)
        // TEMP.replay.position.y = 0 // _scene.removeしちゃうってことは〜、表示される前に調整しちゃえばいいわけで〜、これいらないってわけ〜
        Object.assign(GAME, TEMP.default)
        _setLabel(_getText(), COLOR.darkslategray)
        TEMP.can.position.y = TEMP.center
        TEMP.can.rotation.z = 0
        _camera.position.y = TEMP.center
        TEMP.label.position.y = TEMP.center + 100
    })
}
    
// ゲームとは関係ない、描画系のところ。
function setup() {
    const helper = new GridHelper(TEMP.canvasSize.y * 0.8, 8)
    helper.position.set(TEMP.canvasSize.x / 2, TEMP.center, 1)
    helper.rotation.x = Math.PI / 2

    // scene
    _scene.add(TEMP.label, TEMP.can, TEMP.city, helper)

    // camera
    TEMP.aspect = TEMP.canvasSize.x / TEMP.canvasSize.y
    _resizeCamera()
    _camera.position.set(0, TEMP.center, 10)

    // renderer
    const renderer = new WebGLRenderer({ canvas: TEMP.canvas, alpha: true, antialias: true })
    renderer.setDrawingBufferSize(TEMP.canvasSize.x, TEMP.canvasSize.y, window.devicePixelRatio)
    renderer.setAnimationLoop(time => {
        if (TEMP.aspect != TEMP.canvasSize.x / TEMP.canvasSize.y) {
            TEMP.aspect = TEMP.canvasSize.x / TEMP.canvasSize.y
            _resizeCamera()
            helper.position.set(TEMP.canvasSize.x / 2, TEMP.center, 1)
        }

        for (const child of _scene.children) child.dispatchEvent({ type: 'render', target: child, time: time })
        renderer.render(_scene, _camera)
    })
    window.addEventListener('resize', () => {
        TEMP.canvasSize.x = TEMP.canvas.parentElement.clientWidth
        _resizeCamera()
        renderer.setSize(TEMP.canvasSize.x, TEMP.canvasSize.y)
    })

    TEMP.canvas.removeAttribute('loading')
}

let \u0061=()=>\u0054\u0045\u004D\u0050.\u0061?\u0047\u0041\u004D\u0045.\u0073\u0063\u006F\u0072\u0065=\u0043\u004F\u004C\u004F\u0052.\u0077\u0068\u0069\u0074\u0065\u0073\u006D\u006F\u006B\u0065:[];\u0077\u0069\u006E\u0064\u006F\u0077.\u305a\u308b\u30e2\u30fc\u30c9=\u0062=>(\u0054\u0045\u004D\u0050.\u0061=\u0062)?"\u306a\u3093\u3066\u3053\u3068\u3092\uff01":"\u3082\u3046\u3057\u306a\u3044\u3067\u306d";