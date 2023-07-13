import {
    Raycaster, DoubleSide, Box3, Vector2, Group,
    WebGLRenderer, Scene, OrthographicCamera,
    Mesh, MeshBasicMaterial, ShapeGeometry, CapsuleGeometry, GridHelper, Color
} from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// やり直す時に初期化される変数
const TEMP = { pressed: false, entered: false, score: null, speed: 0, velocity: 0, closed: false, timeCount: 10, lastTime: 0, lastPressed: false, ground: false, splashed: false, shownReplay: false }

// 読み込まれた後からあまり変わらない変数
const LAZY = { font: null, label: null, can: new Group(), city: new Group(), replay: null, default: { ...TEMP }, center: 125, aspect: 0, record: [] }

// 色。
const COLOR = {
    darkslategray: new Color('darkslategray'),
    whitesmoke:    new Color('whitesmoke'),
    darkgray:      new Color('darkgray'),
    darkcyan:      new Color('darkcyan'),
    blueviolet:    new Color('blueviolet'),
    gold:          new Color('gold')
}

// 高さに応じて色々褒めるやつ
const RANK = {
    0:     { color: COLOR.darkslategray, text: 'orz' },
    2000:  { color: COLOR.darkgray,      text: 'よき' },
    4000:  { color: COLOR.darkcyan,      text: 'いい感じ' },
    7000:  { color: COLOR.blueviolet,    text: 'ヤバみあふれてる' },
    10000: { color: COLOR.gold,          text: 'えぐみ限界突破してる' },
}

// ごく稀に入れ替わる最初の文字のやつ
const TEXTS = [ 'ドラッグパットでやってみません？', '縦長モニターが欲しい', 'ズームしたって無駄です！', 'ズームアウトしても無駄です！', 'ミックスで振ってドラッグ！', '大空に羽ばたく缶…', '投げすぎるのもいカンでしょ' ]

function _setText(text, size = 30, replace = undefined) {
    const geometry = new TextGeometry(text, {font: LAZY.font, size: size, height: 1})
    geometry.computeBoundingBox()

    const mesh = replace != undefined && replace.geometry instanceof TextGeometry ? function() {
        replace.geometry.copy(geometry)
        return replace
    }() : new Mesh(geometry, new MeshBasicMaterial({ color: COLOR.darkslategray, transparent: true }))

    mesh.position.x = (geometry.boundingBox.max.x - geometry.boundingBox.min.x) / -2
    return mesh
}

function _setLabel(text, color, size) {
    if (text) _setText(text, size, LAZY.label)
    if (color) LAZY.label.material.color.set(color)
}

function _getText() {
    return Math.random() > 0.1 ? 'ドラッグで振ってミックス！' : TEXTS[parseInt(Math.random() * TEXTS.length)]
}

function _getRank(score) {
    return Object.entries(RANK).reverse().find(entry => entry[0] <= score)[1]
}

window.addEventListener('DOMContentLoaded', async () => {
    await load()
    launch()
})

\u0077\u0069\u006E\u0064\u006F\u0077.\u305a\u308b\u30e2\u30fc\u30c9=\u0062=>(\u004C\u0041\u005A\u0059.\u0061=\u0062)?"\u306a\u3093\u3066\u3053\u3068\u3092\uff01":"\u3082\u3046\u3057\u306a\u3044\u3067\u306d"

async function load() {
    const _fontLoader = new FontLoader()
    const _loadFont = name => new Promise((resolve, reject) => _fontLoader.load(`/public/${name}.json`, resolve, undefined, reject))
    const _svgLoader = new SVGLoader()
    const _loadSVG = (name, opacity = undefined) => new Promise((resolve, reject) => _svgLoader.load(`/public/can/${name}.svg`, ({paths}) => {
        LAZY[name].name = name
        LAZY[name].scale.y = -1
        for (const path of paths) {
            const style = path.userData.style
            const material = new MeshBasicMaterial({ side: DoubleSide, transparent: true, depthWrite:  false, color: style.fill != '#000' ? style.fill : COLOR.darkslategray, opacity: opacity !== undefined ? opacity : style.fillOpacity })
            for (const shape of SVGLoader.createShapes(path)) {
                LAZY[name].add(new Mesh(new ShapeGeometry(shape), material))
            }
        }
        resolve(LAZY[name])
    }, undefined, reject))

    try {
        LAZY.font = await _loadFont('corporate_logo_bold')
        _loadSVG('can')
        _loadSVG('city', 0.75)
    } catch (exception) {
        console.error(exception)
    }
}

async function launch() {
    const _boundingBox = new Box3(), _raycaster = new Raycaster(), _camera = new OrthographicCamera()

    const _canvas = document.getElementById('game')
    _canvas.setAttribute('loading', '初期化中…')
    try {
        init()
    } catch (exception) {
        console.error(exception)
    }
    _canvas.removeAttribute('loading')

    console.log( // ちょっとしたお遊び。
        "   ,_|__, -,,- L__\\ .               ,      .               ,\n",
        "  ,----- ,｣L. / L' |            --|-.  \\  |            --|-.  \\\n",
        " | \\ | / |｣L|  ,_. |              /  \\  \\ |              /  \\  \\\n",
        " |  ,^､  |--| /\\/  |    , _\\-^､  /    | ’ |    , _\\-^､  /    | ’\n",
        "/  /   \\ |--|  /\\  \\___/    \\ ’ /  \\_/    \\___/    \\ ’ /  \\_/\n",
        "==================== create by Unreadabread ===================="
    )

    function _intersectObjects(x, y, objects) {
        const rect = _canvas.getBoundingClientRect()
        _raycaster.setFromCamera(new Vector2(((x - rect.left) / (rect.right - rect.left)) * 2 - 1, -((y - rect.top) / (rect.bottom - rect.top)) * 2 + 1), _camera)
        return _raycaster.intersectObjects(objects)
    }
        
    function _getCanPosition(y) {
        return Math.max(-12.5, Math.min(365.5, -(y - _canvas.clientHeight - LAZY.center / 2))) // かなりゴリ押しです。
    }

    function init() {
        // label
        LAZY.label = _setText(_getText())
        LAZY.label.position.y = LAZY.center + 100
        LAZY.label.addEventListener('render', event => {
            if (TEMP.score == null || TEMP.splashed) {
                const opacity = event.time % 5000 / 5000
                LAZY.label.material.opacity = opacity <= 0.5 ? 1 - opacity : opacity
            }
        })

        // can
        // _boundingBox.setFromObject(LAZY.can)
        // LAZY.can.position.set((_boundingBox.max.x - _boundingBox.min.x) / -2, LAZY.center, 1)
        LAZY.can.position.set(-30, LAZY.center, 1)
        LAZY.can.scale.set(0.2, -0.2, 0.2)
        LAZY.can.addEventListener('mousedown', event => {
            // 缶を追従させるようにします。
            TEMP.pressed = true
            LAZY.can.position.y = _getCanPosition(event.y)
    
            if (TEMP.score == null) {
                TEMP.score = 0
                LAZY.label.material.opacity = 1
            }
        })
        window.addEventListener('mousemove', event => {
            if (TEMP.score == null || !TEMP.pressed) return
    
            const calc = _getCanPosition(event.pageY)
            if (LAZY.can.position.y == calc) return
    
            const movement = Math.abs(LAZY.can.position.y - calc) / 5
    
            if (!TEMP.closed) TEMP.score += movement
            else TEMP.velocity = movement
    
            LAZY.can.position.y = calc
        })
        window.addEventListener('mouseup', () => {
            if (!TEMP.pressed) return
            if (!TEMP.closed) LAZY.can.position.y = LAZY.center
            else TEMP.speed = TEMP.velocity
            TEMP.pressed = false
        })
        LAZY.can.addEventListener('render', event => {
            if (TEMP.score == null) return
            if (!TEMP.closed) {
                if (event.time - TEMP.lastTime <= 1000) return
                TEMP.lastTime = event.time
    
                // 時間を数えたり、時間切れになるところ
                if (TEMP.timeCount > 0) _setLabel(`${TEMP.timeCount--}`)
                else if (TEMP.timeCount == 0) {
                    _setLabel('上にスワイプ！')
                    TEMP.closed = true
                    TEMP.lastPressed = TEMP.pressed
                }
            } else if (!TEMP.splashed) {
                // 5秒以内に押せばギリギリなんとかできます
                // それでも押さなければ勝手に飛んでいきます
                if (!TEMP.lastPressed) TEMP.lastPressed = TEMP.pressed || event.time - TEMP.lastTime > 5000
                else if (!TEMP.pressed) {
                    // 缶が投げられるところ
                    if (!TEMP.ground) {
                        TEMP.speed -= 0.1
                        LAZY.can.position.y += TEMP.speed
    
                        if (Math.abs(TEMP.speed) > 10) TEMP.score += Math.abs(TEMP.speed) / 25
    
                        if (0 >= LAZY.can.position.y) {
                            LAZY.can.position.y = 0
                            TEMP.ground = LAZY.a ? TEMP.score=COLOR.whitesmoke : true
                        }
                    } else {
                        // 上に吹っ飛ぶところ
                        LAZY.can.position.y += TEMP.score / 100
    
                        if (LAZY.can.position.y >= TEMP.score) {
                            LAZY.can.position.y = TEMP.score
                            TEMP.lastTime = event.time
                            TEMP.splashed = true
                        }
    
                        _setLabel(`${Math.floor(LAZY.can.position.y)}m`, _getRank(LAZY.can.position.y).color)
                    }
    
                    if (LAZY.can.position.y >= LAZY.center) {
                        _camera.position.y = LAZY.can.position.y
                        LAZY.label.position.y = _camera.position.y + 100
                    } else {
                        _camera.position.y = LAZY.center
                        LAZY.label.position.y =LAZY.center + 100
                    }
                }
            } else {
                // 缶が飛び終わって落ちるところ
                if (event.time - TEMP.lastTime <= 2000) {
                    const time = event.time - TEMP.lastTime
                    if (LAZY.can.position.y > 0) {
                        LAZY.can.position.y -= time / (time > 1000 ? 50000 : 5000) * _canvas.clientHeight
                        if (TEMP.score > LAZY.center) LAZY.can.rotation.z = time / 3000 * Math.PI
                    }
                    if (LAZY.can.position.y < 0) LAZY.can.position.y = 0
                    return
                }
                if (TEMP.shownReplay) return
    
                // やり直すボタンが出るところ
                const total = Math.floor(TEMP.score)
                _setLabel(`記録: ${total}m\n評価: ${_getRank(total).text}`, undefined, 20)
                LAZY.replay.position.y = _camera.position.y
                _scene.add(LAZY.replay)
                TEMP.shownReplay = true
    
                // ログにも残す
                LAZY.record.push({ score: total, current: true })
                document.getElementById('record').innerHTML = LAZY.record.sort((left, right) => right.score - left.score).slice(0, 5).map(result => result.current && !(result.current = false) ? `<li>${result.score}m ←今のやつ` : `<li>${result.score}m`).join('')
            }
        })
    
        // city
        _boundingBox.setFromObject(LAZY.city)
        LAZY.city.position.x = (_boundingBox.max.x - _boundingBox.min.x) / -2
    
        // canvas(can/replay のクリック、ホバーイベントの発火)
        _canvas.addEventListener('mousedown', event => {
            const object = !TEMP.lastPressed ? LAZY.can : TEMP.shownReplay ? LAZY.replay : null
            if (object && _intersectObjects(event.clientX, event.clientY, [ object ]).length) {
                object.dispatchEvent({ type: 'mousedown', target: object, y: event.pageY })
            }
        })
        _canvas.addEventListener('mousemove', event => {
            if (!TEMP.shownReplay || _intersectObjects(event.clientX, event.clientY, [ LAZY.replay ]).length != TEMP.entered) return
            LAZY.replay.dispatchEvent({ type: TEMP.entered ? 'mouseenter' : 'mouseleave', target: LAZY.replay })
            TEMP.entered = !TEMP.entered
        })
    
        // replay
        LAZY.replay = _setText('やり直す？', 20)
        LAZY.replay.position.set(LAZY.replay.position.x, 0, 2)
        const boundingBox = LAZY.replay.geometry.boundingBox
    
        // 後ろのうっすら出てくるところ
        const button = new Mesh(new CapsuleGeometry(40, 200, 4, 2), new MeshBasicMaterial({ color: COLOR.darkslategray, transparent: true, opacity: 0 }))
        button.position.set(-LAZY.replay.position.x, (boundingBox.max.y - boundingBox.min.y) / 2, 2)
        button.rotation.set(Math.PI / 2, 0, Math.PI / 2)
        LAZY.replay.add(button)
    
        // ホバー関係
        LAZY.replay.addEventListener('mouseenter', () => {
            _canvas.style.cursor = 'pointer'
            LAZY.replay.material.opacity = 0.75
            button.material.opacity = 0.25
        })
        LAZY.replay.addEventListener('mouseleave', () => {
            _canvas.style.cursor = 'default'
            LAZY.replay.material.opacity = 1
            button.material.opacity = 0
        })
        // ここで起動時の状態に戻します。
        LAZY.replay.addEventListener('mousedown', () => {
            _canvas.style.cursor = 'default'
            _scene.remove(LAZY.replay)
            // LAZY.replay.position.y = 0 // _scene.removeしちゃうってことは〜、表示される前に調整しちゃえばいいわけで〜、これいらないってわけ〜
            Object.assign(TEMP, LAZY.default)
            _setLabel(_getText(), COLOR.darkslategray)
            LAZY.can.position.y = LAZY.center
            LAZY.can.rotation.z = 0
            _camera.position.y = LAZY.center
            LAZY.label.position.y = LAZY.center + 100
        })

        // ゲームとは関係ない、描画系のところ。
        const helper = new GridHelper(_canvas.clientHeight * 0.8, 8)
        helper.position.set(_canvas.clientWidth / 2, LAZY.center, 1)
        helper.rotation.x = Math.PI / 2
    
        // camera
        _camera.position.set(0, LAZY.center, 10)
        function _resizeCamera() {
            _camera.left   = -(_camera.right  = _canvas.clientWidth  /  2)
            _camera.bottom = -(_camera.top    = _canvas.clientHeight /  2)
            _camera.updateProjectionMatrix()
        }
        // new OrbitControls(_camera, _canvas)
    
        // scene
        const _scene = new Scene().add(LAZY.label, LAZY.can, LAZY.city, helper)
    
        // renderer
        const renderer = new WebGLRenderer({ canvas: _canvas, alpha: true, antialias: true })
        renderer.setDrawingBufferSize(_canvas.clientWidth, _canvas.clientHeight, window.devicePixelRatio)
        renderer.setAnimationLoop(loop)
        LAZY.aspect = _canvas.clientWidth / _canvas.clientHeight
        function loop(time) {
            _resizeCamera()
            helper.position.set(_canvas.clientWidth / 2, LAZY.center, 1)
            if (LAZY.aspect != _canvas.clientWidth / _canvas.clientHeight) {
                LAZY.aspect = _canvas.clientWidth / _canvas.clientHeight
                _resizeCamera()
                helper.position.set(_canvas.clientWidth / 2, LAZY.center, 1)
            }
    
            for (const child of _scene.children) child.dispatchEvent({ type: 'render', target: child, time: time })
            renderer.render(_scene, _camera)
        }
    }
}