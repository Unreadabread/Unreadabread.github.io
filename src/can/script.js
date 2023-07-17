import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// あとで読み込まれるやつ
const LAZY = { font: null, can: new THREE.Group(), city: new THREE.Group(), mouse: new THREE.Group(), arrow: new THREE.Group() }

// 高さに応じて色々褒めるやつ
// 更新する場合facetype.jsでfont.jsonを作り直すこと。
const RANK = {
    0    : { color: 'darkslategray', text: 'orz'              },
    2000 : { color: 'darkgray',      text: 'よき'              },
    4000 : { color: 'darkcyan',      text: 'いい感じ'           },
    7000 : { color: 'blueviolet',    text: 'ヤバみあふれてる'    },
    10000: { color: 'gold',          text: 'えぐみ限界突破してる' },
}

// 最初の文字のやつ。ごく稀に入れ替わります
// 更新する場合facetype.jsでfont.jsonを作り直すこと。
const TEXTS = [ 'ドラッグで振ってミックス！', 'ドラッグパットでやってみません？', '縦長モニターが欲しい', 'ズームしたって無駄です！', 'ズームアウトしても無駄です！', 'ミックスで振ってドラッグ！', '大空に羽ばたく缶…', '投げすぎるのもいカンでしょ' ]


// 汚染を避けるために_を付けています。念の為。
function _getBoundingBox(object, useGeometry = false) {
    const geometry = object.geometry
    if (useGeometry && geometry instanceof THREE.BufferGeometry) {
        geometry.computeBoundingBox()
        return geometry.boundingBox
    }
    const data = object.userData.boundingBox
    // data.isBox3 もありですが、vscodeの型のマッピングが動作するのはこっちでした。
    const box = data && data instanceof THREE.Box3 ? data : object.userData.boundingBox = new THREE.Box3()
    return box.setFromObject(object)
}

// 0~1を加速減速に変換します
function _easeInOut(value) {
    value = (value < 0.5 ? value : 1 - value) * 2
    return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2
}

function _getRank(score) {
    return Object.entries(RANK).reverse().find(entry => entry[0] <= score)[1]
}

function _getText() {
    const result = Math.random()
    return TEXTS[result > 0.1 ? 0 : parseInt(result * 10 * TEXTS.length)]
}


const _loading = load()

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const stage = await Promise.all([ _loading, init() ])
        start(stage[1])
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
    const _svgLoader = new SVGLoader()

    try {
        LAZY.font = await new FontLoader().loadAsync(`/src/can/font.json`)
        _loadSVG('can')
        _loadSVG('city', 0.75)
        _loadSVG('mouse')
        _loadSVG('arrow')
    } catch (exception) {
        console.error(exception)
    }

    // svgの読み込みはinit()と並行して行います。読み込めればloadedイベントが発火されます。
    function _loadSVG(name, opacity) {
        _svgLoader.load(`/src/can/${name}.svg`, ({paths}) => {
            for (const path of paths) {
                const style = path.userData.style
                const material = new THREE.MeshBasicMaterial({
                    side: THREE.DoubleSide,
                    transparent: true,
                    depthWrite: false,
                    color: style.fill != '#000' ? style.fill : 'darkslategray',
                    opacity: opacity !== undefined ? opacity : style.fillOpacity
                })
                for (const shape of SVGLoader.createShapes(path)) {
                    LAZY[name].add(new THREE.Mesh(new THREE.ShapeGeometry(shape), material))
                }
            }
            LAZY[name].name = name
            LAZY[name].dispatchEvent({ type: 'loaded', target: LAZY[name] })
        })
    }
}

async function init() {
    const _raycaster = new THREE.Raycaster()
    const stage = {
        canvas: document.getElementById('game'),
        camera: new THREE.OrthographicCamera(),
        scene: new THREE.Scene(),
        center: 125,
        intersectObjects(x, y, objects) {
            const rect = stage.canvas.getBoundingClientRect()
            _raycaster.setFromCamera(new THREE.Vector2(((x - rect.left) / (rect.right - rect.left)) * 2 - 1, ((y - rect.top) / (rect.bottom - rect.top)) * -2 + 1), stage.camera)
            return _raycaster.intersectObjects(objects)
        },
        // かなりゴリ押しです。
        getCanPosition(y) {
            return Math.max(-12.5, Math.min(365.5, -(y - stage.canvas.clientHeight - stage.center / 2)))
        }
    }

    { // canvas
        stage.canvas.addEventListener('pointerdown', _select)
        stage.canvas.addEventListener('contextmenu', event => event.preventDefault())

        function _select(event) {
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
            return object instanceof THREE.Group || object instanceof THREE.Mesh
        }
    }

    { // camera
        stage.scene.add(stage.camera)
        stage.camera.position.set(0, stage.center, 10)
        // new OrbitControls(stage.camera, stage.canvas)
    }

    { // renderer
        const _renderer = new THREE.WebGLRenderer({ canvas: stage.canvas, alpha: true, antialias: true })
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
    }

    // svg系はここで初期化します。
    { // can
        stage.scene.add(LAZY.can)
        LAZY.can.position.y = stage.center
        LAZY.can.scale.set(0.2, -0.2, 0.2)
        LAZY.can.addEventListener('loaded', _toCenter.bind(null, LAZY.can))
    }

    { // arrow
        stage.camera.add(LAZY.arrow)
        LAZY.arrow.position.set(60, 0, -1)
        LAZY.arrow.scale.set(1.75, -1.75, 1.75)

        { // mouse
            LAZY.arrow.add(LAZY.mouse)
            LAZY.mouse.position.x = -2
            LAZY.mouse.scale.set(0.4, 0.4, 0.4)
            LAZY.mouse.renderOrder = 1
        }
    }

    { // city
        stage.scene.add(LAZY.city)
        LAZY.city.position.z = -10
        LAZY.city.scale.y = -1
        LAZY.city.addEventListener('loaded', _toCenter.bind(null, LAZY.city))
    }

    function _toCenter(object) {
        const {max, min} = _getBoundingBox(object)
        object.position.x = (max.x - min.x) / -2
    }

    return stage
}

function start(stage) {
    // label
    const _label = new THREE.Mesh(new THREE.ExtrudeGeometry([]), new THREE.MeshBasicMaterial({ color: 'darkslategray', transparent: true }))
    {
        stage.camera.add(_label)
        _label.position.set(0, 100, -15)
        _label.scale.setScalar(stage.scale)
        _setLabel({ text: _getText() })
        stage.scene.addEventListener('resize', resize)

        // ゲーム画面の幅が変わった時に文字の大きさを調整します。
        function resize() {
            _label.scale.setScalar(stage.scale)
            const {max, min} = _getBoundingBox(_label, true)
            _label.position.x = (max.x - min.x) / -2 * stage.scale
        }
    }
    function _setLabel({text, size = 30, color}) {
        if (text) {
            _label.geometry.copy(new THREE.ExtrudeGeometry(LAZY.font.generateShapes(text, size), { depth: 1, bevelEnabled: false }))
            const {max, min} = _getBoundingBox(_label, true)
            _label.position.x = (max.x - min.x) / -2 * stage.scale
        }
        if (color) _label.material.color.set(color)
    }

    // replay
    const _replay = new THREE.Mesh(
        new THREE.ExtrudeGeometry(LAZY.font.generateShapes('やり直す？', 20), { depth: 1, bevelEnabled: false }),
        new THREE.MeshBasicMaterial({ color: 'darkslategray', transparent: true })
    )
    {
        stage.camera.add(_replay)
        _replay.visible = false
        const {max, min} = _getBoundingBox(_replay, true)
        _replay.position.x = (max.x - min.x) / -2
        _replay.position.z = -5
    }

    // 後ろのうっすら出てくるところ
    const _button = new THREE.Mesh(new THREE.CapsuleGeometry(40, 200, 4, 2), new THREE.MeshBasicMaterial({ color: 'darkslategray', transparent: true, opacity: 0.25 }))
    {
        _replay.add(_button)
        _button.visible = false
        const {max, min} = _replay.geometry.boundingBox
        _button.position.set(-_replay.position.x, (max.y - min.y) / 2, 0)
        _button.rotation.set(Math.PI / 2, 0, Math.PI / 2)
    }

    { // ゲームの動作をさせるところ
        LAZY.can.addEventListener('pointerdown', doMove)
        window.addEventListener('pointermove', moving)
        window.addEventListener('pointerup', moved)
        stage.scene.addEventListener('render', game)
        stage.canvas.addEventListener('pointermove', hover)
        _replay.addEventListener('pointerdown', replay)

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
            if (lastPressed == null) LAZY.can.position.y = stage.center
            pressed = false
        }

        // ゲームを制御するところ
        function game({time}) {
            if (score == null) standing(time)
            else if (lastPressed == null) countDown(time)
            else if (!splashed) splash(time)
            else if (!fallCan(time)) showResult(time)
        }
        // 最初の画面のところ
        function standing(time) {
            LAZY.mouse.position.y = 10.75 + _easeInOut(time % 2000 / 2000) * 10
            _label.material.opacity = (_easeInOut(time % 5000 / 5000) + 0.75) * 0.5
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

                if (LAZY.can.position.y >= stage.center) {
                    stage.camera.position.y = LAZY.can.position.y
                } else {
                    stage.camera.position.y = stage.center
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
                ground = LAZY.a ? score = Math.PI ** 14 : true
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
                if (score > stage.center) LAZY.can.rotation.z = current / 3000 * Math.PI
            }
            if (LAZY.can.position.y < 0) LAZY.can.position.y = 0
            return true
        }
        // やり直すボタンが出るところ
        function showResult(time) {
            if (_replay.visible) {
                _label.material.opacity = (_easeInOut(time % 5000 / 5000) + 0.75) * 0.5
                return
            }
            const total = Math.floor(score)
            _setLabel({ text: `記録: ${total}m\n評価: ${_getRank(total).text}`, size: 20 })
            _replay.visible = true
            _replay.position.y = 0
            if (_button.visible) stage.canvas.style.cursor = 'pointer'
            if (LAZY.a) return

            // 記録にも残す
            record.push({ score: total, current: true })
            document.getElementById('record').innerHTML = record.sort((left, right) => right.score - left.score).slice(0, 5).map(result => result.current && !(result.current = false) ? `<li>${result.score}m ←今のやつ` : `<li>${result.score}m`).join('')
        }

        // ホバー関係
        function hover({x, y}) {
            if (splashed == null || stage.intersectObjects(x, y, [ _button ]).length == _button.visible) return

            _button.visible = !_button.visible
            if (_replay.visible) stage.canvas.style.cursor = _button.visible ? 'pointer' : 'default'
            _replay.material.opacity = _button.visible ? 0.75 : 1
        }

        // ここで起動時の状態に戻します。
        function replay() {
            if (!_replay.visible) return

            stage.canvas.style.cursor = 'default'

            score = lastPressed = null
            velocity = timeCount = lastTime = 0
            pressed = ground = splashed = false

            stage.camera.position.y = stage.center
            _setLabel({ text: _getText(), color: 'darkslategray' })
            LAZY.can.position.y = stage.center
            LAZY.can.rotation.z = 0
            _replay.position.y = 1000
            _replay.visible = false
        }
    }
}

\u0077\u0069\u006E\u0064\u006F\u0077.\u305a\u308b\u30e2\u30fc\u30c9=\u0062=>(\u004C\u0041\u005A\u0059.\u0061=\u0062)?"\u306a\u3093\u3066\u3053\u3068\u3092\uff01":"\u3082\u3046\u3057\u306a\u3044\u3067\u306d"