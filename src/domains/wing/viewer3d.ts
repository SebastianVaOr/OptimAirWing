/**
 * Visualizador 3D de Alta Fidelidad para Geometría Alar, F1 Motorsport y Hydrofoil Náutico
 */

import * as THREE from 'three';
import { generarNACA } from './naca';
import { LegacyWingInput } from './empirical';
import { VehicleCategory } from '../vehicleDomain';

export function buildWingMesh(params: LegacyWingInput, category: VehicleCategory = 'aircraft'): THREE.Group {
  const { Cr, Ct, b, sweep_deg, twist_deg, nacaCode } = params;
  const naca = generarNACA(nacaCode, 50);
  const numStations = 30;

  // Orientación canónica Three.js:
  // - Eje X: Dirección del Flujo / Cuerda (LE en x ~ -0.25*Cr, TE en x ~ 0.75*Cr)
  // - Eje Y: Espesor / Sustentación / Altura (Vertical UP/DOWN)
  // - Eje Z: Envergadura / Span (de -b/2 a +b/2)

  const zPos: number[] = [];
  for (let i = 0; i < numStations; i++) {
    zPos.push(-b / 2 + (i / (numStations - 1)) * b);
  }

  function getChordAndTwist(z: number) {
    const distFromCenterFrac = Math.abs(z) / (b / 2); // 0 en la raíz (centro z=0), 1.0 en ambas puntas (z=±b/2)
    const chord = Cr + (Ct - Cr) * distFromCenterFrac;
    const twist = twist_deg * distFromCenterFrac; // Torsión simétrica hacia ambas puntas
    return { chord, twist_rad: (twist * Math.PI) / 180 };
  }

  function getSweepX(z: number) {
    const distFromCenter = Math.abs(z);
    return Math.tan((sweep_deg * Math.PI) / 180) * distFromCenter;
  }

  interface Point3D {
    x: number;
    y: number;
    z: number;
  }

  const stations: Array<{ upper: Point3D[]; lower: Point3D[]; z: number }> = [];

  for (let i = 0; i < numStations; i++) {
    const z = zPos[i];
    const { chord, twist_rad } = getChordAndTwist(z);
    const sweepX = getSweepX(z);

    const upper: Point3D[] = [];
    const lower: Point3D[] = [];
    const n = naca.x_u.length;

    const cosA = Math.cos(twist_rad);
    const sinA = Math.sin(twist_rad);

    // Si es F1, invertimos la curvatura Y para emular un perfil de Carga Aerodinámica / Downforce
    const isF1 = category === 'f1_motorsport';
    const invertSign = isF1 ? -1 : 1;

    for (let j = 0; j < n; j++) {
      const x_raw = naca.x_u[j];
      const y_raw = naca.y_u[j] * invertSign;
      const xr = x_raw * cosA - y_raw * sinA;
      const yr = x_raw * sinA + y_raw * cosA;
      const px = (xr - 0.25) * chord + sweepX;
      const py = yr * chord;
      upper.push({ x: px, y: py, z });
    }

    for (let j = 0; j < n; j++) {
      const x_raw = naca.x_l[j];
      const y_raw = naca.y_l[j] * invertSign;
      const xr = x_raw * cosA - y_raw * sinA;
      const yr = x_raw * sinA + y_raw * cosA;
      const px = (xr - 0.25) * chord + sweepX;
      const py = yr * chord;
      lower.push({ x: px, y: py, z });
    }

    stations.push({ upper, lower, z });
  }

  const vertices: number[] = [];
  const indices: number[] = [];

  function addSurface(side: 'upper' | 'lower') {
    const stationIndices: number[] = [];
    for (let i = 0; i < numStations; i++) {
      const pts = stations[i][side];
      const startIdx = vertices.length / 3;
      for (let j = 0; j < pts.length; j++) {
        vertices.push(pts[j].x, pts[j].y, pts[j].z);
      }
      stationIndices.push(startIdx);
    }

    const nPts = stations[0][side].length;
    for (let i = 0; i < numStations - 1; i++) {
      const start1 = stationIndices[i];
      const start2 = stationIndices[i + 1];
      for (let j = 0; j < nPts - 1; j++) {
        const a = start1 + j;
        const bIdx = start1 + j + 1;
        const c = start2 + j;
        const d = start2 + j + 1;
        indices.push(a, bIdx, c);
        indices.push(bIdx, d, c);
      }
    }
  }

  addSurface('upper');
  addSurface('lower');

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  let mainColor = 0x3a8fc9;
  let emissiveColor = 0x0a2a4a;
  let lineColor = 0x22d3ee;

  if (category === 'f1_motorsport') {
    mainColor = 0x111827; // Carbono mate/oscuro F1
    emissiveColor = 0x1e1b4b;
    lineColor = 0xef4444; // Rojo FIA
  } else if (category === 'hydrofoil_nautical') {
    mainColor = 0x0284c7; // Azul náutico hydrofoil
    emissiveColor = 0x032b45;
    lineColor = 0x38bdf8;
  }

  const material = new THREE.MeshPhongMaterial({
    color: mainColor,
    emissive: emissiveColor,
    shininess: 80,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.94,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // Bordes de ataque y salida destacados
  const pointsLE: THREE.Vector3[] = [];
  const pointsTE: THREE.Vector3[] = [];

  for (let i = 0; i < numStations; i++) {
    const up = stations[i].upper;
    const low = stations[i].lower;

    pointsLE.push(new THREE.Vector3((up[0].x + low[0].x) / 2, (up[0].y + low[0].y) / 2, stations[i].z));

    const j = up.length - 1;
    pointsTE.push(new THREE.Vector3((up[j].x + low[j].x) / 2, (up[j].y + low[j].y) / 2, stations[i].z));
  }

  const edgeMaterial = new THREE.LineBasicMaterial({ color: lineColor, linewidth: 2 });
  const lineLE = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsLE), edgeMaterial);
  const lineTE = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsTE), edgeMaterial);

  const group = new THREE.Group();
  group.add(mesh);
  group.add(lineLE);
  group.add(lineTE);

  // -------------------------------------------------------------
  // ELEMENTOS 3D ESPECÍFICOS POR VEHÍCULO (AVIACIÓN, F1 Y NÁUTICA)
  // -------------------------------------------------------------
  if (category === 'aircraft') {
    // FUSELAJE DE AVIACIÓN AEROESPACIAL (Centro z = 0)
    // Proporcional a la cuerda raíz (Cr) y la envergadura (b)
    const fuseLength = Math.max(Cr * 3.2, 4.0);
    const fuseRadius = Math.max(Cr * 0.28, 0.45);

    const fuseGroup = new THREE.Group();

    // Body (Cuerpo Cilíndrico Principal)
    const bodyLength = fuseLength * 0.55;
    const bodyGeo = new THREE.CylinderGeometry(fuseRadius, fuseRadius * 0.95, bodyLength, 32);
    const fuseMat = new THREE.MeshPhongMaterial({
      color: 0x1e293b,
      emissive: 0x0f172a,
      shininess: 90
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, fuseMat);
    bodyMesh.rotation.z = Math.PI / 2; // Orientado a lo largo de X
    bodyMesh.position.set(Cr * 0.1, 0, 0);
    fuseGroup.add(bodyMesh);

    // Nose Cone (Morro Aerodinámico Ojival)
    const noseLength = fuseLength * 0.25;
    const noseGeo = new THREE.ConeGeometry(fuseRadius, noseLength, 32);
    const noseMesh = new THREE.Mesh(noseGeo, fuseMat);
    noseMesh.rotation.z = -Math.PI / 2;
    noseMesh.position.set(-bodyLength / 2 - noseLength / 2 + Cr * 0.1, 0, 0);
    fuseGroup.add(noseMesh);

    // Tail Cone (Cono de Cola Afilado)
    const tailLength = fuseLength * 0.30;
    const tailGeo = new THREE.ConeGeometry(fuseRadius * 0.95, tailLength, 32);
    const tailMesh = new THREE.Mesh(tailGeo, fuseMat);
    tailMesh.rotation.z = Math.PI / 2;
    tailMesh.position.set(bodyLength / 2 + tailLength / 2 + Cr * 0.1, 0, 0);
    fuseGroup.add(tailMesh);

    // Estabilizador Vertical (Deriva de Cola)
    const vStabHeight = fuseRadius * 2.2;
    const vStabShape = new THREE.Shape();
    vStabShape.moveTo(0, 0);
    vStabShape.lineTo(Cr * 0.8, 0);
    vStabShape.lineTo(Cr * 0.5, vStabHeight);
    vStabShape.lineTo(Cr * 0.2, vStabHeight);
    vStabShape.closePath();

    const vStabExtrude = { depth: 0.04, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01 };
    const vStabGeo = new THREE.ExtrudeGeometry(vStabShape, vStabExtrude);
    const vStabMat = new THREE.MeshPhongMaterial({ color: 0x38bdf8, emissive: 0x0369a1, shininess: 80 });
    const vStabMesh = new THREE.Mesh(vStabGeo, vStabMat);
    vStabMesh.position.set(bodyLength / 2 + Cr * 0.1, fuseRadius * 0.8, -0.02);
    fuseGroup.add(vStabMesh);

    group.add(fuseGroup);
  } else if (category === 'f1_motorsport') {
    // -----------------------------------------------------------------
    // F1 MOTORSPORT - ALERÓN TRASERO DE ALTA FIDELIDAD (REAR WING ASSEMBLY)
    // -----------------------------------------------------------------

    // 1. FLAP DRS SUPERIOR CON BISAGRA REAL
    const flapScale = 0.52;
    const flapGeo = geometry.clone();
    flapGeo.scale(flapScale, flapScale, flapScale);
    const flapMat = new THREE.MeshPhongMaterial({
      color: 0xd97706, // Kevlar/Carbono Dorado DRS
      emissive: 0x451a03,
      shininess: 100,
      side: THREE.DoubleSide
    });
    const flapMesh = new THREE.Mesh(flapGeo, flapMat);

    const flapAngleDeg = params.flapAngleDeg ?? 28;
    const flapGapMm = params.flapGapMm ?? 12;
    const flapOverlapMm = params.flapOverlapMm ?? 8;

    const flapGapMeters = (flapGapMm * 0.001) * (Cr / 0.30);
    const flapOverlapMeters = (flapOverlapMm * 0.001) * (Cr / 0.30);
    const flapAngleRad = (flapAngleDeg * Math.PI) / 180;

    const flapPosX = Cr * 0.35 - flapOverlapMeters;
    const flapPosY = Cr * 0.16 + flapGapMeters;

    const flapPivotGroup = new THREE.Group();
    flapPivotGroup.position.set(flapPosX, flapPosY, 0);
    flapPivotGroup.rotation.z = flapAngleRad;

    const flapLeOffset = 0.25 * Cr * flapScale;
    flapMesh.position.set(flapLeOffset, 0, 0);
    flapPivotGroup.add(flapMesh);

    // Gurney Flap (Lip vertical en borde de salida del flap)
    const gurneyGeo = new THREE.BoxGeometry(0.008 * Cr, 0.04 * Cr, b * 0.96);
    const gurneyMat = new THREE.MeshPhongMaterial({ color: 0x1e293b, shininess: 80 });
    const gurney = new THREE.Mesh(gurneyGeo, gurneyMat);
    gurney.position.set(Cr * 0.75 * flapScale + flapLeOffset, 0.02 * Cr, 0);
    flapPivotGroup.add(gurney);

    group.add(flapPivotGroup);

    // 2. BEAM WING DE DOBLE ELEMENTO (Aleta inferior F1 sobre el difusor)
    const beamScale1 = 0.35;
    const beamGeo1 = geometry.clone();
    beamGeo1.scale(beamScale1, beamScale1, beamScale1);
    const beamMat = new THREE.MeshPhongMaterial({ color: 0x1f2937, emissive: 0x111827, shininess: 90, side: THREE.DoubleSide });
    const beamMesh1 = new THREE.Mesh(beamGeo1, beamMat);
    beamMesh1.rotation.z = (14 * Math.PI) / 180;
    beamMesh1.position.set(Cr * 0.1, -Cr * 0.32, 0);
    group.add(beamMesh1);

    const beamScale2 = 0.28;
    const beamGeo2 = geometry.clone();
    beamGeo2.scale(beamScale2, beamScale2, beamScale2);
    const beamMesh2 = new THREE.Mesh(beamGeo2, beamMat);
    beamMesh2.rotation.z = (22 * Math.PI) / 180;
    beamMesh2.position.set(Cr * 0.32, -Cr * 0.24, 0);
    group.add(beamMesh2);

    // 3. CÁPSULA Y ACTUADOR HIDRÁULICO DRS (Pod central aerodinámico)
    const podGeo = new THREE.ConeGeometry(Cr * 0.06, Cr * 0.28, 16);
    const podMat = new THREE.MeshPhongMaterial({ color: 0x0f172a, shininess: 120 });
    const podMesh = new THREE.Mesh(podGeo, podMat);
    podMesh.rotation.z = Math.PI / 2;
    podMesh.position.set(flapPosX - Cr * 0.12, flapPosY + 0.02, 0);

    const pistonGeo = new THREE.CylinderGeometry(0.012, 0.012, Cr * 0.22, 12);
    const pistonMat = new THREE.MeshPhongMaterial({ color: 0xe2e8f0, shininess: 100 });
    const pistonMesh = new THREE.Mesh(pistonGeo, pistonMat);
    pistonMesh.rotation.z = Math.PI / 2 + flapAngleRad * 0.5;
    pistonMesh.position.set(flapPosX, flapPosY, 0);

    group.add(podMesh);
    group.add(pistonMesh);

    // 4. ENDPLATES F1 CON LOUVERS Y FOOTPLATES (Paneles laterales aerodinámicos)
    const epHeight = Cr * 1.55;
    const epLength = Cr * 1.65;
    
    const epShape = new THREE.Shape();
    epShape.moveTo(-epLength * 0.28, -epHeight * 0.50);
    epShape.lineTo(epLength * 0.72, -epHeight * 0.50);
    epShape.lineTo(epLength * 0.62, epHeight * 0.50);
    epShape.lineTo(-epLength * 0.22, epHeight * 0.50);
    epShape.closePath();

    // Ranuras/Louvers para dispersión de vórtices en la parte trasera del endplate
    const holePath = new THREE.Path();
    holePath.moveTo(epLength * 0.45, epHeight * 0.25);
    holePath.lineTo(epLength * 0.58, epHeight * 0.25);
    holePath.lineTo(epLength * 0.56, epHeight * 0.38);
    holePath.lineTo(epLength * 0.43, epHeight * 0.38);
    holePath.closePath();
    epShape.holes.push(holePath);

    const extrudeSettings = { depth: 0.015, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.003, bevelThickness: 0.003 };
    const epGeometry = new THREE.ExtrudeGeometry(epShape, extrudeSettings);
    const epMat = new THREE.MeshPhongMaterial({ color: 0x0f172a, emissive: 0x1e1b4b, shininess: 100 });

    const leftEp = new THREE.Mesh(epGeometry, epMat);
    leftEp.position.set(0, 0, -b / 2 - 0.015);

    const rightEp = new THREE.Mesh(epGeometry, epMat);
    rightEp.position.set(0, 0, b / 2);

    // Footplates laterales inferiores (Deflectores de outwash)
    const footplateGeo = new THREE.BoxGeometry(epLength * 0.85, 0.012, epHeight * 0.12);
    const footplateMat = new THREE.MeshPhongMaterial({ color: 0x1e293b, shininess: 90 });
    const leftFoot = new THREE.Mesh(footplateGeo, footplateMat);
    leftFoot.position.set(Cr * 0.1, -epHeight * 0.50, -b / 2 - 0.04);
    const rightFoot = new THREE.Mesh(footplateGeo, footplateMat);
    rightFoot.position.set(Cr * 0.1, -epHeight * 0.50, b / 2 + 0.04);

    // Franja de Acento Rojo FIA en Endplates
    const trimGeo = new THREE.BoxGeometry(epLength * 0.82, epHeight * 0.045, 0.018);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const leftTrim = new THREE.Mesh(trimGeo, trimMat);
    leftTrim.position.set(Cr * 0.1, epHeight * 0.44, -b / 2 - 0.015);
    const rightTrim = new THREE.Mesh(trimGeo, trimMat);
    rightTrim.position.set(Cr * 0.1, epHeight * 0.44, b / 2 + 0.015);

    // 5. CUELLOS DE CISNE CURVADOS (Swan-Neck Pylons)
    const pylonShape = new THREE.Shape();
    pylonShape.moveTo(-Cr * 0.20, -epHeight * 0.45);
    pylonShape.lineTo(-Cr * 0.08, -epHeight * 0.45);
    pylonShape.lineTo(-Cr * 0.02, epHeight * 0.28);
    pylonShape.lineTo(Cr * 0.20, epHeight * 0.32);
    pylonShape.lineTo(Cr * 0.15, epHeight * 0.42);
    pylonShape.lineTo(-Cr * 0.15, epHeight * 0.38);
    pylonShape.closePath();

    const pylonExtrude = { depth: 0.018, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002 };
    const pylonGeo = new THREE.ExtrudeGeometry(pylonShape, pylonExtrude);
    const pylonMat = new THREE.MeshPhongMaterial({ color: 0x374151, shininess: 80 });

    const pylon1 = new THREE.Mesh(pylonGeo, pylonMat);
    pylon1.position.set(0, 0, -b * 0.14);
    const pylon2 = new THREE.Mesh(pylonGeo, pylonMat);
    pylon2.position.set(0, 0, b * 0.14 - 0.018);

    group.add(leftEp);
    group.add(rightEp);
    group.add(leftFoot);
    group.add(rightFoot);
    group.add(leftTrim);
    group.add(rightTrim);
    group.add(pylon1);
    group.add(pylon2);
  } else if (category === 'hydrofoil_nautical') {
    // -----------------------------------------------------------------
    // HYDROFOIL NÁUTICO DE ALTA FIDELIDAD (AMERICA'S CUP / WINDFOIL STYLE)
    // -----------------------------------------------------------------

    // 1. TORPEDO / BULBO HIDRODINÁMICO CON MORRO OJIVAL Y ESTABILIZADOR
    const fuselageLength = Cr * 2.8;
    const fuselageRadius = Cr * 0.12;
    const fuselageMat = new THREE.MeshPhongMaterial({ color: 0x0284c7, emissive: 0x075985, shininess: 110 });

    const fuseGroup = new THREE.Group();
    // Body Torpedo
    const bodyGeo = new THREE.CylinderGeometry(fuselageRadius, fuselageRadius * 0.75, fuselageLength * 0.6, 32);
    const bodyMesh = new THREE.Mesh(bodyGeo, fuselageMat);
    bodyMesh.rotation.z = Math.PI / 2;
    bodyMesh.position.set(Cr * 0.1, 0, 0);
    fuseGroup.add(bodyMesh);

    // Morro Torpedo (Bulbo frontal)
    const noseGeo = new THREE.SphereGeometry(fuselageRadius, 24, 24);
    noseGeo.scale(1.8, 1.0, 1.0);
    const noseMesh = new THREE.Mesh(noseGeo, fuselageMat);
    noseMesh.position.set(-fuselageLength * 0.3 + Cr * 0.1, 0, 0);
    fuseGroup.add(noseMesh);

    // Cono de cola
    const tailGeo = new THREE.ConeGeometry(fuselageRadius * 0.75, fuselageLength * 0.4, 24);
    const tailMesh = new THREE.Mesh(tailGeo, fuselageMat);
    tailMesh.rotation.z = Math.PI / 2;
    tailMesh.position.set(fuselageLength * 0.5 + Cr * 0.1, 0, 0);
    fuseGroup.add(tailMesh);

    // Estabilizador Horizontal de Cola (Elevador Náutico)
    const stabScale = 0.32;
    const stabGeo = geometry.clone();
    stabGeo.scale(stabScale, stabScale, stabScale);
    const stabMesh = new THREE.Mesh(stabGeo, fuselageMat);
    stabMesh.position.set(Cr * 1.4, 0, 0);
    fuseGroup.add(stabMesh);

    group.add(fuseGroup);

    // 2. MÁSTIL/STRUT HIDRODINÁMICO CON PERFIL AERODINÁMICO EXTRUIDO
    const strutHeight = Math.max(b * 0.70, 0.9);
    const strutShape = new THREE.Shape();
    // NACA simétrico para el mástil
    strutShape.moveTo(-Cr * 0.18, 0);
    strutShape.quadraticCurveTo(0, Cr * 0.06, Cr * 0.22, 0);
    strutShape.quadraticCurveTo(0, -Cr * 0.06, -Cr * 0.18, 0);
    strutShape.closePath();

    const strutExtrude = { depth: strutHeight, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002 };
    const strutGeo = new THREE.ExtrudeGeometry(strutShape, strutExtrude);
    const strutMat = new THREE.MeshPhongMaterial({ color: 0x0369a1, emissive: 0x0f172a, shininess: 100 });
    const strut = new THREE.Mesh(strutGeo, strutMat);
    strut.rotation.x = -Math.PI / 2; // Extruir hacia arriba en Y
    strut.position.set(Cr * 0.05, 0, 0);
    group.add(strut);

    // 3. WINGLETS ANTI-VENTILACIÓN EN PUNTAS DE ALA (CURVADOS HACIA ABAJO/ARRIBA)
    const wingletHeight = Cr * 0.35;
    const wingletShape = new THREE.Shape();
    wingletShape.moveTo(0, 0);
    wingletShape.lineTo(Ct * 0.9, 0);
    wingletShape.lineTo(Ct * 0.5, wingletHeight);
    wingletShape.lineTo(Ct * 0.1, wingletHeight);
    wingletShape.closePath();

    const wingletExtrude = { depth: 0.015, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002 };
    const wingletGeo = new THREE.ExtrudeGeometry(wingletShape, wingletExtrude);
    const wingletMat = new THREE.MeshPhongMaterial({ color: 0x38bdf8, shininess: 100 });

    const leftWinglet = new THREE.Mesh(wingletGeo, wingletMat);
    leftWinglet.rotation.z = Math.PI / 12;
    leftWinglet.position.set(0, -0.02, -b / 2);

    const rightWinglet = new THREE.Mesh(wingletGeo, wingletMat);
    rightWinglet.rotation.z = Math.PI / 12;
    rightWinglet.position.set(0, -0.02, b / 2 - 0.015);

    group.add(leftWinglet);
    group.add(rightWinglet);

    // 4. EMBARCACIÓN / SILUETA DEL CASCO NÁUTICO (BOAT HULL DECK)
    // Se ubica justo sobre la línea de agua en y = strutHeight
    const hullLength = Math.max(Cr * 4.5, 3.5);
    const hullBeam = Math.max(b * 0.85, 1.2);
    const hullHeight = 0.28;

    const hullShape = new THREE.Shape();
    // Perfil lateral del casco de barco/tabla
    hullShape.moveTo(-hullLength * 0.45, 0);
    hullShape.quadraticCurveTo(-hullLength * 0.50, hullHeight * 0.8, -hullLength * 0.42, hullHeight);
    hullShape.lineTo(hullLength * 0.45, hullHeight);
    hullShape.lineTo(hullLength * 0.48, 0);
    hullShape.closePath();

    const hullExtrude = { depth: hullBeam, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04 };
    const hullGeo = new THREE.ExtrudeGeometry(hullShape, hullExtrude);
    const hullMat = new THREE.MeshPhongMaterial({
      color: 0x0f172a,
      emissive: 0x1e293b,
      shininess: 100
    });
    const hullMesh = new THREE.Mesh(hullGeo, hullMat);
    hullMesh.position.set(Cr * 0.1, strutHeight, -hullBeam / 2);
    group.add(hullMesh);

    // 5. SUPERFICIE MARINA TRANSLÚCIDA (Nivel del agua)
    const waterGeo = new THREE.PlaneGeometry(Cr * 8, b * 2.8);
    const waterMat = new THREE.MeshPhongMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = Math.PI / 2; // Plano horizontal X-Z
    water.position.set(0, strutHeight * 0.85, 0);
    group.add(water);

    // Rejilla Marina Cyan
    const gridHelper = new THREE.GridHelper(b * 2.8, 16, 0x38bdf8, 0x0284c7);
    gridHelper.position.set(0, strutHeight * 0.85, 0);
    group.add(gridHelper);
  }

  return group;
}
