
const GOLDEN_RATIO = 1/1.618
window.addEventListener("load", () => {
    const sketch = (p) => {

        const rippleHz = p.sqrt(2)/10
        const ripplePeriod = 1/rippleHz
        const shiftHz = 0.05
        const shiftPeriod = 1/shiftHz

        const sizeNoiseScale = GOLDEN_RATIO
        const shiftNoiseScale = sizeNoiseScale/2
        const starBaseSize = 8
        const starExtraSize = 24
        const starBasePoints = 4

        const spacing = 42

        const rippleControlLoopParams = {
            p: 1,
            d: 0.2,
        }
        const rippleXControlLoopState = {lastErr: null}
        const rippleYControlLoopState = {lastErr: null}

        const rippleConstraints = {
            v: 200,
            a: 1000,
            m: 5,
            mu: [.2, 0.1]
        }

        let rippleKinematics = {
            x: null, y: null,
            vx: 0, vy: 0,
            ax: 0, ay: 0
        }

        let starExtraPoints = []

        p.setup = () => {
            const el = document.getElementById("animation")
            p.createCanvas(el.clientWidth, el.clientHeight)
            p.frameRate(24)
            // 1 rotation of hue, 100% Sat, 100% Lightness
            p.colorMode(p.HSL, 1, 1, 1)
            p.noStroke()
            p.fill("#fff")
        }

        p.windowResized = () => {
            const el = document.getElementById("animation")
            p.resizeCanvas(el.clientWidth, el.clientHeight)
        }

        p.draw = () => {
            p.background("#111");

            const clockFraction = (p.millis() / 1000)
            const rippleClockFraction = (clockFraction % ripplePeriod) / ripplePeriod
            const shiftClockFraction = (clockFraction % shiftPeriod) / shiftPeriod


            const gridWidth = p.floor(p.width / spacing) -1
            const leftMargin = (p.width - spacing*(gridWidth - 1))/2
            const gridHeight = p.floor(p.height / spacing) -1
            const topMargin = (p.height - spacing*(gridHeight - 1))/2
            const maxDiagonal = p.dist(
                p.width, p.height,
                0, 0
            )

            if (starExtraPoints.length !== gridHeight || starExtraPoints[0].length !== gridWidth){
                starExtraPoints = []
                for (var row = 0; row < gridHeight; row++) {
                    starExtraPoints[row] = []
                    for (var col = 0; col < gridWidth; col++) {
                        starExtraPoints[row][col] = p.random([0,1,2,3,4])
                    }
                }
            }

            if (rippleKinematics.x === null && rippleKinematics.y === null) {
                rippleKinematics = {...rippleKinematics, x: p.width / 2, y: p.height / 2, }
            }

            let targetRippleKinematics = {...rippleKinematics}
            const doInteraction = document.visibilityState === "visible" && p.focused

            if (doInteraction && p.touches.length > 0) {
                targetRippleKinematics = p.touches[0]
            } else if (doInteraction && p.mouseIsPressed) {
                targetRippleKinematics = {x: p.mouseX, y: p.mouseY}
            } else {
                targetRippleKinematics = {x: p.width / 2, y: p.height / 2}
            }

            rippleKinematics.ax = p.doControlLoop(rippleKinematics.x, targetRippleKinematics.x, rippleXControlLoopState)
            rippleKinematics.ay = p.doControlLoop(rippleKinematics.y, targetRippleKinematics.y, rippleYControlLoopState)

            rippleKinematics = p.doPhysicsStep(rippleKinematics)

            p.debugKinematics(rippleKinematics, targetRippleKinematics)

            for (let row = 0; row < gridHeight; row++) {
                const rowFraction = row / (gridHeight - 1)
                for (let col = 0; col < gridWidth; col++) {
                    const colFraction = col / (gridWidth - 1)

                    const starX = leftMargin + col*spacing
                    const starY = topMargin + row*spacing

                    const colorOffset = p.dist(
                        starX, starY,
                        rippleKinematics.x, rippleKinematics.y
                    ) / maxDiagonal

                    const colorClockSine = (p.sin(2*p.PI*(rippleClockFraction - p.sqrt(colorOffset))))
                    const scaledColor = (colorClockSine + 1)/2
                    p.fill(scaledColor, .9, 0.7)

                    const rippleClockSine = (p.sin(2*p.PI*(rippleClockFraction)))
                    const shiftClockSine = (p.sin(2*p.PI*(shiftClockFraction)))
                    const sizeNoise = p.noise(
                        sizeNoiseScale * rowFraction,
                        sizeNoiseScale * colFraction,
                        sizeNoiseScale * rippleClockSine,
                    )
                    const xNoise = p.noise(
                        shiftNoiseScale * rowFraction,
                        shiftNoiseScale * shiftClockSine,
                    )
                    const yNoise = p.noise(
                        shiftNoiseScale * shiftClockSine,
                        shiftNoiseScale * colFraction,
                    )

                    p.star(
                        starX + (starExtraSize * (xNoise-0.5)),
                        starY + (starExtraSize * (yNoise-0.5)),
                        starBaseSize + starExtraSize * sizeNoise,
                        starBasePoints + (starExtraPoints !== null ? starExtraPoints[row][col] : 0)
                    );
                }
            }
        }

        p.star = (x, y, d, pointCount) => {
            const r = d/2
            const roundness = GOLDEN_RATIO/2

            // must start with a real vertex
            p.beginShape()
            const firstPoint = [0, -1]
            p.vertex(
                x + firstPoint[0] * r,
                y + firstPoint[1] * r
            )
            let lastPoint = firstPoint
            for (var i = 1; i < pointCount; i++) {
                const angle = 2 * p.PI * (0.25 + i / pointCount)
                // negative sine due to weird coordinate space
                const point = [p.cos(angle), -p.sin(angle)]
                p.bezierVertex(
                    x + r*lastPoint[0] * roundness,
                    y + r*lastPoint[1] * roundness,
                    x + r*point[0] * roundness,
                    y + r*point[1] * roundness,
                    x + r*point[0],
                    y + r*point[1]
                )
                lastPoint = point
            }
            // close last point to beginning
            p.bezierVertex(
                x + r*lastPoint[0] * roundness,
                y + r*lastPoint[1] * roundness,
                x + r*firstPoint[0] * roundness,
                y + r*firstPoint[1] * roundness,
                x + r*firstPoint[0],
                y + r*firstPoint[1]
            )
            p.endShape()
        }

        p.doControlLoop = (pv, sp, state) => {
            if (state.lastErr === null) {
                state.lastErr = 0
            }
            const err = sp - pv
            const deltaErr = (err - state.lastErr) / p.deltaTime / 1000
            state.lastErr = err
            return rippleControlLoopParams.p * err + rippleControlLoopParams.d * deltaErr
        }

        p.doPhysicsStep = (k) => {
            k = {...k}

            // Omit g
            const fn = rippleConstraints.mu[1] * rippleConstraints.m
            const xFriction = fn * -k.vx
            const yFriction = fn * -k.vy
            k.ax = p.constrain(k.ax + xFriction, -rippleConstraints.a, rippleConstraints.a)
            k.vx = p.constrain(k.vx + (k.ax * p.deltaTime / 1000), -rippleConstraints.v, rippleConstraints.v)
            k.x = p.constrain(k.x + (k.vx * p.deltaTime / 1000), 0, p.width)

            k.ay = p.constrain(k.ay + yFriction, -rippleConstraints.a, rippleConstraints.a)
            k.vy = p.constrain(k.vy + (k.ay * p.deltaTime / 1000), -rippleConstraints.v, rippleConstraints.v)
            k.y = p.constrain(k.y + (k.vy * p.deltaTime / 1000), 0, p.height)

            return k
        }

        p.debugKinematics = (k, k2) => {
            p.fill("#fff")
            p.circle(k.x, k.y, 10)
            p.noFill()
            p.stroke("#0f0")
            p.line(k.x, k.y, k.x + k.vx, k.y + k.vy)
            p.stroke("#00f")
            p.line(k.x, k.y, k.x + k.ax, k.y + k.ay)
            p.stroke("#fff")
            p.circle(k2.x, k2.y, 10)
            p.noStroke()
        }
    }
    let animation = new p5(sketch, "animation")
});
