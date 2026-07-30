import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OptimAirWing API',
      version: '1.0.0',
      description: 'API de OptimAirWing — diseño y optimización aerodinámica de alas con IA',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Desarrollo' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
    },
  },
  apis: ['./server/api/*.ts', './server.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
