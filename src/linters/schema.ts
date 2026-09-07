import Ajv from 'ajv';
import type { Diagnostic, LinterOptions } from '../types.js';

const AjvClass = (Ajv as any).default || Ajv;
const ajv = new AjvClass({ allErrors: true, strict: false });

export function lintSchemaContract(tool: any, _options: LinterOptions = {}): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const schema = tool.inputSchema;
  if (!schema) {
    diagnostics.push({
      ruleId: 'SCH-001',
      ruleName: 'Missing Input Schema',
      severity: 'error',
      message: `Tool '${tool.name}' does not declare an 'inputSchema'.`,
      recommendation: `Add a valid JSON Schema object with 'type: "object"' and 'properties'.`
    });
    return diagnostics;
  }

  // Validate JSON schema syntax with Ajv
  try {
    const isSchemaValid = ajv.validateSchema(schema);
    if (!isSchemaValid && ajv.errors) {
      diagnostics.push({
        ruleId: 'SCH-002',
        ruleName: 'Malformed JSON Schema',
        severity: 'error',
        message: `Tool '${tool.name}' has invalid JSON Schema: ${ajv.errorsText(ajv.errors)}`,
        recommendation: `Ensure 'inputSchema' complies with JSON Schema Draft-07 specification.`
      });
    }
  } catch (err: any) {
    diagnostics.push({
      ruleId: 'SCH-002',
      ruleName: 'JSON Schema Compilation Error',
      severity: 'error',
      message: `Failed to compile schema: ${err.message}`,
      recommendation: `Check schema structure for circular references or invalid keywords.`
    });
  }

  // Check type: "object"
  if (schema.type !== 'object') {
    diagnostics.push({
      ruleId: 'SCH-003',
      ruleName: 'Top-Level Schema Not Object',
      severity: 'error',
      message: `Top-level 'inputSchema.type' must be "object", found "${schema.type || 'undefined'}".`,
      recommendation: `Set 'inputSchema.type = "object"' as required by MCP specification.`
    });
  }

  const properties = schema.properties || {};
  const required = Array.isArray(schema.required) ? schema.required : [];

  // Check required fields existence in properties
  for (const reqField of required) {
    if (!properties[reqField]) {
      diagnostics.push({
        ruleId: 'SCH-004',
        ruleName: 'Missing Required Property Definition',
        severity: 'error',
        paramName: reqField,
        message: `Field '${reqField}' is listed in 'required', but is missing from 'properties'.`,
        recommendation: `Define the property '${reqField}' under 'properties' with an explicit type and description.`
      });
    }
  }

  // Check individual property definitions
  for (const [propName, propDef] of Object.entries<any>(properties)) {
    if (!propDef.type && !propDef.$ref && !propDef.oneOf && !propDef.anyOf) {
      diagnostics.push({
        ruleId: 'SCH-005',
        ruleName: 'Untyped Property',
        severity: 'error',
        paramName: propName,
        message: `Property '${propName}' does not declare an explicit 'type'.`,
        recommendation: `Specify 'type: "string" | "number" | "boolean" | "array" | "object"'.`
      });
    }

    if (propDef.enum && Array.isArray(propDef.enum) && propDef.enum.length === 0) {
      diagnostics.push({
        ruleId: 'SCH-006',
        ruleName: 'Empty Enum',
        severity: 'error',
        paramName: propName,
        message: `Enum for property '${propName}' is an empty array.`,
        recommendation: `Provide valid enum options or remove the enum restriction.`
      });
    }
  }

  return diagnostics;
}
