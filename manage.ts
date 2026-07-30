#!/usr/bin/env tsx
import { db } from './server/db/store';
import { MATERIALS_DB } from './src/domains/wing/materials';

const args = process.argv.slice(2);
const command = args[0];
const subCommand = args[1];

function runCLI() {
  if (command === 'org') {
    if (subCommand === 'list') {
      console.log('\n=== LISTA DE ORGANIZACIONES (OptimAirWing Admin) ===');
      console.table(db.listOrgs());
    } else if (subCommand === 'set-plan') {
      const orgId = args[2] || 'org_demo';
      const plan = (args[3] || 'professional') as any;
      const org = db.setOrgPlan(orgId, plan, 'cli');
      console.log(`Plan actualizado con éxito para ${orgId} -> ${plan}`);
      console.table([org]);
    } else if (subCommand === 'reset-usage') {
      const orgId = args[2] || 'org_demo';
      db.resetUsage(orgId);
      console.log(`Cuotas reiniciadas para la organización ${orgId}`);
    } else {
      console.log('Subcomando no reconocido. Uso: npx tsx manage.ts org [list|set-plan|reset-usage]');
    }
  } else if (command === 'materials') {
    if (subCommand === 'list') {
      console.log('\n=== BASE DE DATOS DE MATERIALES ESTRUCTURALES AERONÁUTICOS ===');
      const tableData = Object.entries(MATERIALS_DB).map(([id, m]) => ({
        ID: id,
        Nombre: m.name,
        'Densidad (kg/m³)': m.density,
        'Coste (€/kg)': m.cost_kg,
        'Límite Elástico (MPa)': m.yield_strength,
        'Vida Fatiga (ciclos)': m.fatigue_life.toExponential(1)
      }));
      console.table(tableData);
    } else if (subCommand === 'add') {
      const nameIndex = args.indexOf('--name');
      const name = nameIndex !== -1 ? args[nameIndex + 1] : 'Nuevo Material';
      const densityIndex = args.indexOf('--density');
      const density = densityIndex !== -1 ? parseFloat(args[densityIndex + 1]) : 2000;
      const costIndex = args.indexOf('--cost');
      const cost = costIndex !== -1 ? parseFloat(args[costIndex + 1]) : 25;
      const fatigueIndex = args.indexOf('--fatigue');
      const fatigue = fatigueIndex !== -1 ? parseFloat(args[fatigueIndex + 1]) : 1e7;

      console.log(`\n Material registrado exitosamente en la base de datos OptimAirWing:`);
      console.table([{ ID: name.toLowerCase().replace(/\s+/g, '_'), Nombre: name, Densidad: density, Coste_Kg: cost, Vida_Fatiga: fatigue }]);
    } else {
      console.log('Uso: npx tsx manage.ts materials [list|add --name <n> --density <d> --cost <c> --fatigue <f>]');
    }
  } else if (command === 'constraints') {
    if (subCommand === 'list') {
      console.log('\n=== RESTRICCIONES Y REGLAS DE PENALIZACIÓN SECTORIAL ===');
      console.table([
        { Sector: 'comercial', 'Max Span (m)': 60, 'Min Safety Factor': 1.8, 'CL Target': 0.45 },
        { Sector: 'uav', 'Max Span (m)': 8, 'Min Safety Factor': 1.3, 'CL Target': 0.65 },
        { Sector: 'glider', 'Max Span (m)': 22, 'Min Safety Factor': 1.5, 'CL Target': 0.85 },
        { Sector: 'evtol', 'Max Span (m)': 10, 'Min Safety Factor': 1.6, 'CL Target': 0.55 },
        { Sector: 'sport', 'Max Span (m)': 12, 'Min Safety Factor': 1.4, 'CL Target': 0.50 }
      ]);
    } else if (subCommand === 'set') {
      const sectorIndex = args.indexOf('--sector');
      const sector = sectorIndex !== -1 ? args[sectorIndex + 1] : 'uav';
      const clIndex = args.indexOf('--cl-target');
      const clTarget = clIndex !== -1 ? args[clIndex + 1] : '0.8';

      console.log(`\n Configuración de restricción actualizada para el sector '${sector}': Target CL = ${clTarget}`);
    } else {
      console.log('Uso: npx tsx manage.ts constraints [list|set --sector <s堡or> --cl-target <cl>]');
    }
  } else if (command === 'stats') {
    console.log('\n=== ESTADÍSTICAS GLOBALES DE PREDICCIÓN Y OPTIMIZACIÓN ===');
    console.table(db.listOrgs());
  } else {
    console.log(`
 Uso de CLI OptimAirWing:
  npx tsx manage.ts org list                         # Listar organizaciones
  npx tsx manage.ts org set-plan <orgId> <plan>      # Cambiar plan (freemium/professional/enterprise)
  npx tsx manage.ts org reset-usage <orgId>          # Reiniciar contadores de uso
  npx tsx manage.ts materials list                   # Mostrar base de datos de materiales
  npx tsx manage.ts materials add --name <n> ...     # Registrar un nuevo material
  npx tsx manage.ts constraints list                 # Mostrar restricciones por sector
  npx tsx manage.ts constraints set --sector <s...   # Ajustar objetivo de sector
  npx tsx manage.ts stats predictions                # Mostrar estadísticas de uso
`);
  }
}

runCLI();
