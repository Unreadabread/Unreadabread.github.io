import {
    Raycaster, DoubleSide, Box3, Vector2, Group, Color,
    WebGLRenderer, Scene, OrthographicCamera,
    Mesh, MeshBasicMaterial, ShapeGeometry, CapsuleGeometry, ExtrudeGeometry, BufferGeometry, Vector3, AnimationClip
} from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'

// 読み込まれた後からあまり変わらない変数
const LAZY = { font: null, can: new Group(), city: new Group(), mouse: new Group(), arrow: new Group(), center: 125 }

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


// 汚染を避けるために_を付けています。念の為。
function _toCenter(object) {
    const data = object.userData.boundingBox
    // data.isBox3 もありですが、vscodeの型のマッピングが動作するのはこっちでした。
    const box = data && data instanceof Box3 ? data : object.userData.boundingBox = new Box3()
    const {max, min} = box.setFromObject(object)
    object.position.x = (max.x - min.x) / -2
}

function _getText() {
    return Math.random() > 0.1 ? 'ドラッグで振ってミックス！' : TEXTS[parseInt(Math.random() * TEXTS.length)]
}

function _getRank(score) {
    return Object.entries(RANK).reverse().find(entry => entry[0] <= score)[1]
}

const _loading = load()
window.addEventListener('DOMContentLoaded', async () => {
    try {
        start((await Promise.all([ _loading, init() ]))[1])
    } catch (exception) {
        console.error(exception)
    }

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
    const _fontLoader = new FontLoader(), _svgLoader = new SVGLoader()
    function _loadFont(name) {
        return new Promise((resolve, reject) => _fontLoader.load(`/public/${name}.json`, resolve, undefined, reject))
    }

    function _loadSVG(name, opacity = undefined) {
        return new Promise((resolve, reject) => _svgLoader.load(`/public/can/${name}.svg`, ({paths}) => {
            for (const path of paths) {
                const style = path.userData.style
                const material = new MeshBasicMaterial({ side: DoubleSide, transparent: true, depthWrite:  false, color: style.fill != '#000' ? style.fill : COLOR.darkslategray, opacity: opacity !== undefined ? opacity : style.fillOpacity })
                for (const shape of SVGLoader.createShapes(path)) {
                    LAZY[name].add(new Mesh(new ShapeGeometry(shape), material))
                }
            }
            LAZY[name].name = name
            LAZY[name].dispatchEvent({ type: 'loaded', target: LAZY[name] })
            resolve(LAZY[name])
        }, undefined, reject))
    }

    try {
        LAZY.font = await _loadFont('corporate_logo_bold')
        _loadSVG('can')
        _loadSVG('city', 0.75)
        _loadSVG('mouse')
        _loadSVG('arrow')
    } catch (exception) {
        console.error(exception)
    }
}

async function init() {
    const _raycaster = new Raycaster()
    const stage = {
        canvas: document.getElementById('game'),
        camera: new OrthographicCamera(),
        scene: new Scene(),
        intersectObjects(x, y, objects) {
            const rect = stage.canvas.getBoundingClientRect()
            _raycaster.setFromCamera(new Vector2(((x - rect.left) / (rect.right - rect.left)) * 2 - 1, ((y - rect.top) / (rect.bottom - rect.top)) * -2 + 1), stage.camera)
            return _raycaster.intersectObjects(objects)
        },
        // かなりゴリ押しです。
        getCanPosition(y) {
            return Math.max(-12.5, Math.min(365.5, -(y - stage.canvas.clientHeight - LAZY.center / 2)))
        }
    }

    // canvas
    stage.canvas.addEventListener('pointerdown', _allDown)
    stage.canvas.addEventListener('contextmenu', event => event.preventDefault())

    function _allDown(event) {
        for (const intersect of stage.intersectObjects(event.x, event.y, stage.scene.children)) {
            for (let object = intersect.object; object.parent; object = object.parent) {
                if (!_isObject(object.parent) && _isObject(object)) {
                    if (object.visible) object.dispatchEvent({ type: 'pointerdown', target: object, y: event.pageY })
                    break
                }
            }
        }
    }
    function _isObject(object) {
        return object instanceof Group || object instanceof Mesh
    }
    stage.canvas.addEventListener('resize', () => console.log('a'))

    // camera
    stage.scene.add(stage.camera)
    stage.camera.position.set(0, LAZY.center, 10)

    // renderer
    const _renderer = new WebGLRenderer({ canvas: stage.canvas, alpha: true, antialias: true })
    _renderer.setDrawingBufferSize(stage.canvas.clientWidth, stage.canvas.clientHeight, window.devicePixelRatio)
    _renderer.setAnimationLoop(_render)

    let _aspect = null
    function _render(time) {
        const aspect = stage.canvas.clientWidth / stage.canvas.clientHeight
        if (_aspect != aspect) {
            _aspect = aspect
            
            stage.camera.left   = -(stage.camera.right = stage.canvas.clientWidth  / 2)
            stage.camera.bottom = -(stage.camera.top   = stage.canvas.clientHeight / 2)

            stage.scale = Math.min(1, aspect)
            stage.scene.dispatchEvent({ type: 'resize', target: stage.scene })
        }
        stage.camera.updateProjectionMatrix()

        stage.scene.dispatchEvent({ type: 'render', target: stage.scene, time: time })
        _renderer.render(stage.scene, stage.camera)
    }
    return stage
}

function start(stage) {
    // label
    const _label = new Mesh(new ExtrudeGeometry([]), new MeshBasicMaterial({ color: COLOR.darkslategray, transparent: true }))
    {
        stage.camera.add(_label)
        _label.position.set(0, 100, -15)
        _label.scale.setScalar(stage.scale)
        _setLabel({ text: _getText() })
        stage.scene.addEventListener('resize', resize)

        function resize() {
            _label.scale.setScalar(stage.scale)
            _toCenter(_label)
        }
    }
    function _setLabel({text, size = 30, color}) {
        if (text) {
            _label.geometry.copy(new ExtrudeGeometry(LAZY.font.generateShapes(text, size), { depth: 1, bevelEnabled: false }))
            _toCenter(_label)
        }
        if (color) _label.material.color.set(color)
    }

    { // can
        stage.scene.add(LAZY.can)
        LAZY.can.position.y = LAZY.center
        LAZY.can.scale.set(0.2, -0.2, 0.2)
        LAZY.can.addEventListener('loaded', () => _toCenter(LAZY.can))
    }

    { // arrow
        stage.camera.add(LAZY.arrow)
        LAZY.arrow.position.set(50, 0, -5)
        LAZY.arrow.scale.y = -1

        // mouse
        LAZY.arrow.add(LAZY.mouse)
    }

    { // city
        stage.scene.add(LAZY.city)
        LAZY.city.position.z = -10
        LAZY.city.scale.y = -1
        LAZY.city.addEventListener('loaded', () => _toCenter(LAZY.city))
    }

    // replay
    const _replay = new Mesh(
        new ExtrudeGeometry(LAZY.font.generateShapes('やり直す？', 20), { depth: 1, bevelEnabled: false }),
        new MeshBasicMaterial({ color: COLOR.darkslategray, transparent: true })
    )
    {
        stage.camera.add(_replay)
        _replay.visible = false
        _replay.position.z = -5
        _replay.scale.setScalar(stage.scale)
        _toCenter(_replay)
        stage.canvas.addEventListener('pointermove', hover)
        stage.scene.addEventListener('resize', resize)

        // 後ろのうっすら出てくるところ
        const button = new Mesh(new CapsuleGeometry(40, 200, 4, 2), new MeshBasicMaterial({ color: COLOR.darkslategray, transparent: true, opacity: 0.25 }))
        {
            _replay.add(button)
            button.visible = false
            const {max, min} = _replay.userData.boundingBox
            button.position.set((max.x - min.x) / 2, (max.y - min.y) / 2, 1)
            button.rotation.set(Math.PI / 2, 0, Math.PI / 2)
        }

        let entered = false

        // ホバー関係
        function hover({x, y}) {
            if (!_replay.visible || stage.intersectObjects(x, y, [ _replay ]).length != entered) return

            stage.canvas.style.cursor = entered ? 'pointer' : 'default'
            _replay.material.opacity = entered ? 0.75 : 1
            button.visible = entered

            entered = !entered
        }
        function resize() {
            _replay.scale.setScalar(stage.scale)
            _replay.remove(button)
            _toCenter(_replay)
            _replay.add(button)
        }
    }

    { // game
        LAZY.can.addEventListener('pointerdown', doMove)
        _replay.addEventListener('pointerdown', replay)
        window.addEventListener('pointermove', moving)
        window.addEventListener('pointerup', moved)
        stage.scene.addEventListener('render', game)

        const record = []
        let score = null
        let velocity = 0
        let timeCount = 0
        let lastTime = 0
        let ground = false
        let splashed = false
        let pressed = false
        let lastPressed = null
        
        // 缶を追従させるところ
        function doMove({y}) {
            if (lastPressed) return
            pressed = true
            LAZY.can.position.y = stage.getCanPosition(y)
    
            if (score == null) {
                score = 0
                _label.material.opacity = 1
                LAZY.arrow.visible = false
            }
        }
        // 缶の動きをスコアにしたり、勢いにするところ
        function moving({pageY}) {
            if (!pressed) return
    
            const position = stage.getCanPosition(pageY)
            const movement = Math.abs(LAZY.can.position.y - position) / 5
    
            if (lastPressed == null) score += movement
            else velocity = movement
    
            LAZY.can.position.y = position
        }
        // 缶の位置を元に戻すところ
        function moved() {
            if (!pressed) return
            if (lastPressed == null) LAZY.can.position.y = LAZY.center
            pressed = false
        }

        // ゲームを制御するところ
        function game({time}) {
            if (score == null) standing(time)
            else if (lastPressed == null) countDown(time)
            else if (!splashed) splash(time)
            else if (!fallCan(time) && !_replay.visible) showResult()
        }
        // 最初の画面のところ
        function standing(time) {
            const float = time % 2000 / 2000
            LAZY.mouse.position.y = (float <= 0.5 ? float : 1 - float) * 4 - 1 * 10
            
            const opacity = time % 5000 / 5000
            _label.material.opacity = opacity <= 0.5 ? 1 - opacity : opacity
        }
        // 時間を数えたり、時間切れになるところ
        function countDown(time) {
            if (time - lastTime <= 1000) return
            lastTime = time
    
            if (timeCount < 10) _setLabel({ text: `${10 - timeCount++}` })
            else {
                _setLabel({ text: '上にスワイプ！' })
                lastPressed = pressed
            }
        }
        // 缶を上に飛ばします
        function splash(time) {
            // 5秒以内に押せばギリギリなんとかできます
            // それでも押さなければ勝手に飛んでいきます
            if (!lastPressed) lastPressed = pressed || time - lastTime > 5000
            else if (!pressed) {
                ground ? blow(time) : throwing()
    
                if (LAZY.can.position.y >= LAZY.center) {
                    stage.camera.position.y = LAZY.can.position.y
                } else {
                    stage.camera.position.y = LAZY.center
                }
            }
        }
        // 缶が上に投げられるところ
        function throwing() {
            velocity -= 0.1
            LAZY.can.position.y += velocity
    
            if (Math.abs(velocity) > 10) score += Math.abs(velocity) / 25
    
            if (0 >= LAZY.can.position.y) {
                LAZY.can.position.y = 0
                ground = LAZY.a ? score = COLOR.whitesmoke : true
            }
        }
        // 上に吹っ飛ぶところ
        function blow(time) {
            LAZY.can.position.y += score / 100
    
            if (LAZY.can.position.y >= score) {
                LAZY.can.position.y = score
                lastTime = time
                splashed = true
            }
    
            _setLabel({ text: `${Math.floor(LAZY.can.position.y)}m`, color: _getRank(LAZY.can.position.y).color })
        }
        // 缶が飛び終わって落ちるところ
        function fallCan(time) {
            if (time - lastTime > 2000) return false

            const current = time - lastTime
            if (LAZY.can.position.y > 0) {
                LAZY.can.position.y -= current / (current > 1000 ? 50000 : 5000) * stage.canvas.clientHeight
                if (score > LAZY.center) LAZY.can.rotation.z = current / 3000 * Math.PI
            }
            if (LAZY.can.position.y < 0) LAZY.can.position.y = 0
            return true
        }
        // やり直すボタンが出るところ
        function showResult() {
            const total = Math.floor(score)
            _setLabel({ text: `記録: ${total}m\n評価: ${_getRank(total).text}`, size: 20 })
            _replay.visible = true
    
            // 記録にも残す
            record.push({ score: total, current: true })
            document.getElementById('record').innerHTML = record.sort((left, right) => right.score - left.score).slice(0, 5).map(result => result.current && !(result.current = false) ? `<li>${result.score}m ←今のやつ` : `<li>${result.score}m`).join('')
        }
        // ここで起動時の状態に戻します。
        function replay() {
            if (!_replay.visible) return

            stage.canvas.style.cursor = 'default'
            
            score = lastPressed = null
            velocity = timeCount = lastTime = 0
            pressed = ground = splashed = false

            stage.camera.position.y = LAZY.center
            _setLabel({ text: _getText(), color: COLOR.darkslategray })
            LAZY.can.position.y = LAZY.center
            LAZY.can.rotation.z = 0
            LAZY.arrow.visible = true
            _replay.visible = false
        }
    }
}

\u0077\u0069\u006E\u0064\u006F\u0077.\u305a\u308b\u30e2\u30fc\u30c9=\u0062=>(\u004C\u0041\u005A\u0059.\u0061=\u0062)?"\u306a\u3093\u3066\u3053\u3068\u3092\uff01":"\u3082\u3046\u3057\u306a\u3044\u3067\u306d"