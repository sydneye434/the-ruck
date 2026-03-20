// Lightweight OpenAPI spec for the v1 JSON REST API.
// Note: this is intentionally hand-written to avoid runtime dependency on decorators/generators.

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "The Ruck API",
    version: "0.1.0",
    description:
      "Scrum-native sprint, capacity, and retrospective management backend. Responses use a consistent envelope: { data, error, meta }."
  },
  servers: [{ url: "http://localhost:3001" }],
  tags: [
    { name: "Team" },
    { name: "Sprints" },
    { name: "Stories" },
    { name: "Retros" },
    { name: "Settings" }
  ],
  components: {
    schemas: {
      ApiEnvelope: {
        type: "object",
        properties: {
          data: {},
          error: {
            type: "object",
            nullable: true,
            properties: {
              message: { type: "string" },
              code: { type: "string" }
            },
            required: ["message", "code"]
          },
          meta: { type: "object", additionalProperties: true, nullable: true }
        },
        required: ["data", "error"]
      },
      TeamMember: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          role: { type: "string", example: "Scrum Master" },
          avatar: { type: "object", properties: { color: { type: "string" }, initials: { type: "string" } } },
          defaultAvailabilityDays: { type: "number" },
          isActive: { type: "boolean" },
          createdAt: { type: "string" },
          updatedAt: { type: "string" }
        },
        required: ["id", "name", "role", "avatar", "defaultAvailabilityDays", "isActive"]
      },
      Sprint: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          goal: { type: "string" },
          status: { type: "string", enum: ["active", "completed"] },
          completedAt: { type: "string", nullable: true },
          velocityDataPoint: { type: "number", nullable: true },
          createdAt: { type: "string" },
          updatedAt: { type: "string" }
        }
      },
      Story: {
        type: "object",
        properties: {
          id: { type: "string" },
          sprintId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          storyPoints: { type: "integer", enum: [1, 2, 3, 5, 8, 13] },
          assigneeMemberId: { type: ["string", "null"] },
          labels: { type: "array", items: { type: "string" } },
          acceptanceCriteria: { type: "array", items: { type: "string" } },
          boardColumn: { type: "string", enum: ["backlog", "in_progress", "in_review", "done"] },
          createdAt: { type: "string" },
          updatedAt: { type: "string" }
        }
      },
      Retro: {
        type: "object",
        properties: {
          id: { type: "string" },
          sprintId: { type: "string" },
          template: { type: "string" },
          isInProgress: { type: "boolean" },
          areCardsAnonymous: { type: "boolean" },
          createdAt: { type: "string" },
          updatedAt: { type: "string" }
        }
      },
      RetroCard: {
        type: "object",
        properties: {
          id: { type: "string" },
          retroId: { type: "string" },
          phase: { type: "string", enum: ["reflect", "discuss", "action_items"] },
          content: { type: "string" },
          authorMemberId: { type: "string" },
          upvotes: { type: "number" },
          clusterKey: { type: "string", nullable: true },
          createdAt: { type: "string" },
          updatedAt: { type: "string" }
        }
      },
      RetroActionItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          retroId: { type: "string" },
          description: { type: "string" },
          ownerMemberId: { type: "string" },
          dueDate: { type: "string" },
          isCompleted: { type: "boolean" },
          createdAt: { type: "string" },
          updatedAt: { type: "string" }
        }
      },
      AppSettings: {
        type: "object",
        properties: {
          id: { type: "string" },
          sprintLengthDays: { type: "number" },
          velocityWindow: { type: "number", enum: [1, 2, 3, 5] },
          storyPointScale: { type: "string", enum: ["fibonacci", "tshirt"] },
          defaultRetroTemplate: { type: "string", enum: ["start_stop_continue", "4ls", "mad_sad_glad"] },
          defaultAnonymous: { type: "boolean" },
          dateFormat: { type: "string", enum: ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] },
          createdAt: { type: "string" },
          updatedAt: { type: "string" }
        }
      },

      Error: {
        type: "object",
        properties: {
          message: { type: "string" },
          code: { type: "string" }
        },
        required: ["message", "code"]
      }
    }
  },
  paths: {
    "/api/team-members": {
      get: {
        tags: ["Team"],
        summary: "List team members",
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } }
      },
      post: {
        tags: ["Team"],
        summary: "Create team member",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: { type: "string" },
                  avatar: { type: "object", properties: { color: { type: "string" }, initials: { type: "string" } } },
                  defaultAvailabilityDays: { type: "number" },
                  isActive: { type: "boolean" }
                },
                required: ["name", "role", "avatar", "defaultAvailabilityDays", "isActive"]
              }
            }
          }
        },
        responses: { "200": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } }
      }
    },
    "/api/team-members/{id}": {
      get: {
        tags: ["Team"],
        summary: "Get team member by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } }
      },
      patch: {
        tags: ["Team"],
        summary: "Update team member",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } }
      },
      delete: {
        tags: ["Team"],
        summary: "Delete team member (soft-delete via repository deletion behavior)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } }
      }
    },

    "/api/sprints": {
      get: { tags: ["Sprints"], summary: "List sprints", responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      post: {
        tags: ["Sprints"],
        summary: "Create sprint",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, startDate: { type: "string" }, endDate: { type: "string" }, goal: { type: "string" }, status: { type: "string", enum: ["active", "completed"] } }, required: ["name", "startDate", "endDate", "goal"] } } }
        },
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } }
      }
    },
    "/api/sprints/{id}": {
      get: { tags: ["Sprints"], summary: "Get sprint", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      patch: { tags: ["Sprints"], summary: "Update sprint", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } }, responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      delete: { tags: ["Sprints"], summary: "Delete sprint", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } }
    },
    "/api/sprints/{id}/complete": {
      post: {
        tags: ["Sprints"],
        summary: "Complete sprint and compute velocity",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        description: "Marks sprint as `completed` and stores `velocityDataPoint` as the sum of done stories' storyPoints for the sprint.",
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } }
      }
    },

    "/api/stories": {
      get: {
        tags: ["Stories"],
        summary: "List stories (optionally filtered)",
        parameters: [
          { name: "sprintId", in: "query", required: false, schema: { type: "string", example: "backlog" } }
        ],
        description: "If `sprintId=backlog`, returns unassigned backlog stories (boardColumn=`backlog`). Otherwise returns stories for that sprintId.",
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } }
      },
      post: {
        tags: ["Stories"],
        summary: "Create story",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } },
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } }
      }
    },
    "/api/stories/{id}": {
      get: { tags: ["Stories"], summary: "Get story", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      patch: { tags: ["Stories"], summary: "Update story", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } }, responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      delete: { tags: ["Stories"], summary: "Delete story", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } }
    },

    "/api/retros": {
      get: { tags: ["Retros"], summary: "List retros", responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      post: { tags: ["Retros"], summary: "Create retro", requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } }, responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } }
    },
    "/api/retros/{id}": {
      get: { tags: ["Retros"], summary: "Get retro", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      patch: { tags: ["Retros"], summary: "Update retro", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } }, responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      delete: { tags: ["Retros"], summary: "Delete retro", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } }
    },

    "/api/retros/{id}/cards": {
      get: { tags: ["Retros"], summary: "List retro cards", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      post: { tags: ["Retros"], summary: "Create retro card", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } }, responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } }
    },
    "/api/retros/{id}/cards/{cardId}": {
      get: { tags: ["Retros"], summary: "Get retro card", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "cardId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      patch: { tags: ["Retros"], summary: "Update retro card", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "cardId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } }, responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      delete: { tags: ["Retros"], summary: "Delete retro card", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "cardId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } }
    },

    "/api/retros/{id}/action-items": {
      get: { tags: ["Retros"], summary: "List retro action items", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      post: { tags: ["Retros"], summary: "Create retro action item", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } }, responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } }
    },
    "/api/retros/{id}/action-items/{actionItemId}": {
      get: { tags: ["Retros"], summary: "Get retro action item", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "actionItemId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      patch: { tags: ["Retros"], summary: "Update retro action item", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "actionItemId", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } }, responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      delete: { tags: ["Retros"], summary: "Delete retro action item", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "actionItemId", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } }
    },

    "/api/settings": {
      get: { tags: ["Settings"], summary: "Get settings (creates defaults if missing)", responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } },
      put: { tags: ["Settings"], summary: "Update settings", requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: true } } } }, responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiEnvelope" } } } } } }
    }
  }
};

