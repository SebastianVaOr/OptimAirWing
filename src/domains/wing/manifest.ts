export const wingManifest = {
  domain_id: 'wing',
  display_name: 'Ala Aeronáutica',
  param_schema: 'schemas/wing_v1.json',
  predictors: ['neuralfoil-v1', 'empirical-v1'],
  viewer_3d_module: 'src/domains/wing/viewer3d.ts',
  viewer_2d_module: 'src/domains/wing/viewer2d.ts',
  report_template: 'src/report/reportGenerator.ts'
};
