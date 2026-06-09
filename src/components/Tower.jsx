import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges, ContactShadows } from '@react-three/drei'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const smooth = (t) => t * t * (3 - 2 * t)
const hash = (n) => {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}

const COL = {
  stone: '#d8c7aa',
  stoneDark: '#bda884',
  bronze: '#9c6a40',
  podium: '#cdb993',
  crown: '#222a31',
  green: '#41583a',
  winOn: '#ffc785',
  winOff: '#39352d',
  glassCool: '#86a8cc',
  edgeStone: '#7c6a4e',
  edgeCrown: '#3a4650',
  ground: '#cbb89a',
  spire: '#c4862f',
  plate: '#b7a079',
  tileAvail: '#e7ddc8',
  tileSold: '#e0a55a',
  tileYours: '#c4862f',
}

const PROFILE = [
  { w: 3.0, h: 0.9, mat: 'podium', win: 'tall' },
  { w: 2.8, h: 0.44, mat: 'stone', win: 1 },
  { w: 2.8, h: 0.44, mat: 'stone', win: 1, terrace: true },
  { w: 2.55, h: 0.44, mat: 'bronze', win: 1 },
  { w: 2.55, h: 0.44, mat: 'bronze', win: 1, terrace: true },
  { w: 2.35, h: 0.44, mat: 'bronze', win: 1 },
  { w: 2.35, h: 0.44, mat: 'stone', win: 1, terrace: true },
  { w: 2.15, h: 0.44, mat: 'stone', win: 1 },
  { w: 2.15, h: 0.44, mat: 'bronze', win: 1, terrace: true },
  { w: 1.95, h: 0.44, mat: 'stone', win: 1 },
  { w: 1.95, h: 0.44, mat: 'stone', win: 1, terrace: true },
  { w: 1.75, h: 0.5, mat: 'stone', win: 1 },
  { w: 1.6, h: 0.85, mat: 'crown', win: 'lattice' },
]

function buildWindows(faceW, faceH, seed, tall) {
  const cols = Math.max(2, Math.round(faceW / 0.32))
  const cellW = faceW / cols
  const winW = cellW * 0.55
  const winH = (tall ? 0.8 : 0.62) * faceH
  const arr = []
  for (let c = 0; c < cols; c++) {
    arr.push({
      x: -faceW / 2 + (c + 0.5) * cellW,
      winW,
      winH,
      on: hash(seed + c * 3.3) > 0.32,
    })
  }
  return arr
}

function matProps(mat) {
  switch (mat) {
    case 'bronze':
      return { color: COL.bronze, roughness: 0.5, metalness: 0.25 }
    case 'podium':
      return { color: COL.podium, roughness: 0.6, metalness: 0.05 }
    case 'crown':
      return { color: COL.crown, roughness: 0.25, metalness: 0.5 }
    default:
      return { color: COL.stone, roughness: 0.65, metalness: 0.05 }
  }
}

function paneMaterial(wd, onColor, onInt) {
  const lit = wd.on
  return (
    <meshStandardMaterial
      color={lit ? '#15130f' : COL.winOff}
      emissive={lit ? onColor : '#000000'}
      emissiveIntensity={lit ? onInt : 0}
      roughness={0.3}
      metalness={0.25}
    />
  )
}

function Facade({ w, d, h, win }) {
  const tall = win === 'tall'
  const lattice = win === 'lattice'
  const front = useMemo(() => buildWindows(w, h, w * 13.7, tall), [w, h, tall])
  const side = useMemo(() => buildWindows(d, h, d * 7.1 + 5, tall), [d, h, tall])
  const onColor = lattice ? COL.glassCool : COL.winOn
  const onInt = lattice ? 0.3 : tall ? 1.1 : 0.85
  return (
    <group>
      {front.map((wd, i) => (
        <mesh key={`f${i}`} position={[wd.x, 0, d / 2 + 0.012]}>
          <boxGeometry args={[wd.winW, wd.winH, 0.02]} />
          {paneMaterial(wd, onColor, onInt)}
        </mesh>
      ))}
      {side.map((wd, i) => (
        <mesh key={`s${i}`} position={[w / 2 + 0.012, 0, wd.x]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[wd.winW, wd.winH, 0.02]} />
          {paneMaterial(wd, onColor, onInt)}
        </mesh>
      ))}
    </group>
  )
}

function Terrace({ w, d }) {
  const items = useMemo(() => {
    const n = Math.max(2, Math.round(w / 0.6))
    return Array.from({ length: n }, (_, i) => ({ x: -w / 2 + (i + 0.5) * (w / n), n }))
  }, [w])
  return (
    <group>
      {items.map((p, i) => (
        <mesh key={i} position={[p.x, 0.06, d / 2 - 0.09]} castShadow>
          <boxGeometry args={[(w / p.n) * 0.7, 0.13, 0.16]} />
          <meshStandardMaterial color={COL.green} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function Floor({ data, total, progress }) {
  const grp = useRef()
  const { i, w, d, h, mat, win, terrace, y } = data
  useFrame(() => {
    const p = progress.current
    // assembled at top → lifts up & clears away as you scroll inward (top-floor-first)
    const start = ((total - 1 - i) / total) * 0.32
    const e = easeOut(clamp((p - start) / 0.28, 0, 1))
    const g = grp.current
    if (!g) return
    g.position.x = e * Math.sin(i * 0.7) * 0.5
    g.position.y = y + e * (2.4 + i * 0.7)
    g.position.z = e * Math.cos(i * 0.9) * 0.4
    g.rotation.y = e * Math.sin(i * 1.3) * 0.06
    g.scale.setScalar(1 - 0.05 * e)
    g.visible = e < 0.999
  })
  return (
    <group ref={grp}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial {...matProps(mat)} />
        <Edges threshold={15} color={mat === 'crown' ? COL.edgeCrown : COL.edgeStone} />
      </mesh>
      <Facade w={w} d={d} h={h} win={win} />
      {terrace && (
        <group position={[0, h / 2, 0]}>
          <Terrace w={w} d={d} />
        </group>
      )}
    </group>
  )
}

function Neighbor({ position, w, d, height }) {
  const rows = Math.max(3, Math.round(height / 0.5))
  const rowH = height / rows
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[w, height, d]} />
        <meshStandardMaterial color={COL.stoneDark} roughness={0.7} metalness={0.05} />
        <Edges threshold={15} color={COL.edgeStone} />
      </mesh>
      {Array.from({ length: rows }, (_, r) => (
        <group key={r} position={[0, rowH * (r + 0.5), 0]}>
          <Facade w={w} d={d} h={rowH} win={1} />
        </group>
      ))}
    </group>
  )
}

// The floor plan that the camera dives into: a grid of square-metre tiles.
function FloorGrid({ progress, plateY, plateW, cols, rows }) {
  const inst = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const cell = plateW / cols
  const depth = plateW * 0.92
  const cellD = depth / rows

  const tiles = useMemo(() => {
    const cx = (cols - 1) / 2
    const cz = (rows - 1) / 2
    const maxD = Math.hypot(cx, cz)
    const arr = []
    let idx = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const yours = c >= 4 && c <= 7 && r >= 5 && r <= 8
        const sold = yours || hash(idx * 1.7) > 0.85
        arr.push({
          x: (c - cx) * cell,
          z: (r - cz) * cellD,
          dist: Math.hypot(c - cx, r - cz) / maxD,
          sold,
          yours,
        })
        idx++
      }
    }
    return arr
  }, [cols, rows, cell, cellD])

  useEffect(() => {
    if (!inst.current) return
    const a = new THREE.Color(COL.tileAvail)
    const s = new THREE.Color(COL.tileSold)
    const y = new THREE.Color(COL.tileYours)
    tiles.forEach((t, i) => inst.current.setColorAt(i, t.yours ? y : t.sold ? s : a))
    if (inst.current.instanceColor) inst.current.instanceColor.needsUpdate = true
  }, [tiles])

  useFrame(() => {
    if (!inst.current) return
    const p = progress.current
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i]
      const e = easeOut(clamp((p - 0.3 - t.dist * 0.16) / 0.2, 0, 1))
      const h = (t.sold ? 0.18 : 0.06) * Math.max(0.0001, e)
      dummy.position.set(t.x, plateY + 0.04 + h / 2, t.z)
      dummy.scale.set(cell * 0.85, h, cellD * 0.85)
      dummy.updateMatrix()
      inst.current.setMatrixAt(i, dummy.matrix)
    }
    inst.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <mesh position={[0, plateY, 0]} receiveShadow>
        <boxGeometry args={[plateW * 1.05, 0.05, depth * 1.05]} />
        <meshStandardMaterial color={COL.plate} roughness={0.85} />
      </mesh>
      <instancedMesh ref={inst} args={[undefined, undefined, tiles.length]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.5} metalness={0.1} />
      </instancedMesh>
    </group>
  )
}

// Spire flies away with the top floors (instead of hanging in the air).
function Spire({ progress, total, top }) {
  const ref = useRef()
  useFrame(() => {
    const e = easeOut(clamp(progress.current / 0.4, 0, 1))
    const g = ref.current
    if (!g) return
    g.position.y = top + 0.4 + e * (2.4 + total * 0.7)
    g.visible = e < 0.999
  })
  return (
    <mesh ref={ref} position={[0, top + 0.4, 0]} castShadow>
      <cylinderGeometry args={[0.02, 0.05, 0.9, 8]} />
      <meshStandardMaterial color={COL.spire} metalness={0.7} roughness={0.3} />
    </mesh>
  )
}

// A token coin minted from an owned square — rises, spins, glows.
function Coin({ progress, plateY, x, z, delay }) {
  const ref = useRef()
  useFrame((state) => {
    const e = easeOut(clamp((progress.current - 0.6 - delay) / 0.16, 0, 1))
    const g = ref.current
    if (!g) return
    g.visible = e > 0.001
    const t = state.clock.elapsedTime
    g.position.set(x, plateY + 0.12 + e * 0.62 + Math.sin(t * 2 + x * 9) * 0.04 * e, z)
    g.rotation.y = t * 1.6
    g.scale.setScalar(e)
  })
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.03, 30]} />
        <meshStandardMaterial
          color="#e8b56a"
          metalness={0.85}
          roughness={0.22}
          emissive="#c4862f"
          emissiveIntensity={0.45}
        />
      </mesh>
    </group>
  )
}

function OwnerTokens({ progress, plateY }) {
  const coins = useMemo(
    () => [
      { x: -0.05, z: 0.0, delay: 0 },
      { x: 0.2, z: 0.24, delay: 0.06 },
      { x: -0.24, z: 0.22, delay: 0.11 },
      { x: 0.06, z: -0.22, delay: 0.16 },
    ],
    []
  )
  return (
    <group>
      {coins.map((c, i) => (
        <Coin key={i} progress={progress} plateY={plateY} {...c} />
      ))}
    </group>
  )
}

// Cinematic camera that flies from a wide exterior shot down into the floor plan.
function Rig({ progress, offX, lowY, portrait }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(offX, 0.4, 0), [offX])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const WP = useMemo(
    () =>
      portrait
        ? [
            // mobile: building sits in the UPPER half (camera looks low), then dives to the plan
            { p: 0, pos: [2.6, 0.6, 19], look: [0, -1.9, 0] },
            { p: 0.32, pos: [2.2, 2.4, 12], look: [0, -1.6, 0] },
            { p: 0.56, pos: [1.6, 4.8, 7], look: [0, lowY + 0.2, 0] },
            { p: 0.74, pos: [1.1, 6.0, 5], look: [0, lowY, 0] },
            { p: 1, pos: [1.1, 6.0, 5], look: [0, lowY, 0] },
          ]
        : [
            { p: 0, pos: [offX + 5.5, 1.2, 18.5], look: [offX, 0.4, 0] },
            { p: 0.32, pos: [offX + 4.0, 3.2, 10.5], look: [offX, -0.4, 0] },
            { p: 0.56, pos: [offX + 2.6, 5.2, 6.6], look: [offX, lowY + 0.3, 0] },
            { p: 0.74, pos: [offX + 1.7, 6.4, 4.6], look: [offX, lowY, 0] },
            { p: 1, pos: [offX + 1.7, 6.4, 4.6], look: [offX, lowY, 0] },
          ],
    [offX, lowY, portrait]
  )
  useFrame(() => {
    const p = clamp(progress.current, 0, 1)
    let a = WP[0]
    let b = WP[WP.length - 1]
    for (let i = 0; i < WP.length - 1; i++) {
      if (p >= WP[i].p && p <= WP[i + 1].p) {
        a = WP[i]
        b = WP[i + 1]
        break
      }
    }
    const t = b.p === a.p ? 0 : smooth((p - a.p) / (b.p - a.p))
    tmp.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * t,
      a.pos[1] + (b.pos[1] - a.pos[1]) * t,
      a.pos[2] + (b.pos[2] - a.pos[2]) * t
    )
    camera.position.lerp(tmp, 0.1)
    look.set(
      a.look[0] + (b.look[0] - a.look[0]) * t,
      a.look[1] + (b.look[1] - a.look[1]) * t,
      a.look[2] + (b.look[2] - a.look[2]) * t
    )
    camera.lookAt(look)
  })
  return null
}

export default function Tower({ progress }) {
  const { size } = useThree()
  const portrait = size.height > size.width
  const s = portrait ? clamp(size.width / 1600, 0.3, 0.46) : clamp(size.width / 1500, 0.4, 0.62)
  const offX = portrait ? 0 : 1.5
  const spin = useRef()

  const { floors, top } = useMemo(() => {
    let y = 0
    const out = []
    PROFILE.forEach((p, i) => {
      out.push({ ...p, i, d: p.w * 0.9, y: y + p.h / 2 })
      y += p.h + 0.05
    })
    return { floors: out, top: y }
  }, [])
  const baseY = -top / 2
  const lowY = baseY * s // world height of the floor plan

  useFrame(() => {
    if (spin.current) spin.current.rotation.y = -0.32 + progress.current * 0.16
  })

  return (
    <group>
      <hemisphereLight args={['#fff0d8', '#b29a72', 0.65]} />
      <ambientLight intensity={0.32} />
      <directionalLight
        position={[9, 9, 5]}
        intensity={1.7}
        color="#ffd6a0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={10}
        shadow-camera-bottom={-3}
      />
      <directionalLight position={[-7, 5, -4]} intensity={0.4} color="#9fb8d6" />

      <group scale={s} position={[offX, 0, 0]}>
        <group ref={spin} position={[0, baseY, 0]}>
          {floors.map((f) => (
            <Floor key={f.i} data={f} total={floors.length} progress={progress} />
          ))}
          <Spire progress={progress} total={floors.length} top={top} />
        </group>

        <FloorGrid progress={progress} plateY={baseY} plateW={2.9} cols={12} rows={12} />
        <OwnerTokens progress={progress} plateY={baseY} />

        <group position={[0, baseY, 0]}>
          <Neighbor position={[-4.3, 0, -1.6]} w={1.8} d={2.2} height={2.6} />
          <Neighbor position={[4.3, 0, -1.7]} w={1.9} d={2.2} height={3.1} />
          <Neighbor position={[-3.5, 0, 1.9]} w={1.5} d={1.5} height={1.7} />
        </group>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, baseY - 0.02, 0]} receiveShadow>
          <circleGeometry args={[15, 48]} />
          <meshStandardMaterial color={COL.ground} roughness={0.95} />
        </mesh>
        <ContactShadows
          position={[0, baseY + 0.04, 0]}
          opacity={0.45}
          scale={18}
          blur={2.8}
          far={9}
          color="#3a2f22"
        />
      </group>

      <Rig progress={progress} offX={offX} lowY={lowY} portrait={portrait} />
    </group>
  )
}
