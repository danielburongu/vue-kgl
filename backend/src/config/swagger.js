// src/config/swagger.js
import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Karibu Groceries API",
      version: "1.0.0",
      description:
        "API documentation for the Karibu Groceries Wholesale Cereal Management System",
      contact: {
        name: "daniel burongu",
        email: "burongudaniel@gmail.com",
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
          ? "https://production-domain.com"   // to update later
          : "http://localhost:5000",
        description: process.env.NODE_ENV === "production" ? "Production" : "Development",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

    // Global security - applied to all routes by default
    // You can override per-route with security: []
    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  // Include YAML or more paths if you split documentation later
  apis: [
    "./src/routes/*.js",
    "./src/controllers/*.js",     //  controllers
    // "./src/models/*.js",       // optional - for schemas
  ],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;