import { invoke } from '@tauri-apps/api/core';
import type {
  Environment,
  EnvironmentVariable
} from '../types/environment';

export class EnvironmentApiService {
  // Environment CRUD operations
  static async createEnvironment(
    workspaceId: string,
    name: string
  ): Promise<Environment> {
    return invoke('create_environment', {
      workspaceId,
      name
    });
  }

  static async getEnvironment(environmentId: string): Promise<Environment | null> {
    return invoke('get_environment', { environmentId });
  }

  static async updateEnvironment(environment: Environment): Promise<Environment> {
    return invoke('update_environment', { environment });
  }

  static async deleteEnvironment(environmentId: string): Promise<boolean> {
    return invoke('delete_environment', { environmentId });
  }

  static async listEnvironments(workspaceId: string): Promise<Environment[]> {
    return invoke('list_environments', { workspaceId });
  }

  // Environment variable operations
  static async addVariable(
    environmentId: string,
    variable: EnvironmentVariable
  ): Promise<Environment> {
    return invoke('add_environment_variable', {
      environmentId,
      variable
    });
  }

  static async updateVariable(
    environmentId: string,
    variable: EnvironmentVariable
  ): Promise<Environment> {
    return invoke('update_environment_variable', {
      environmentId,
      variable
    });
  }

  static async removeVariable(
    environmentId: string,
    variableKey: string
  ): Promise<Environment> {
    return invoke('remove_environment_variable', {
      environmentId,
      variableKey
    });
  }

  // Variable substitution
  static async substituteVariables(
    text: string,
    variables: Record<string, string>
  ): Promise<string> {
    return invoke('substitute_environment_variables', {
      text,
      variables
    });
  }

  static async extractVariables(text: string): Promise<string[]> {
    return invoke('extract_environment_variables', { text });
  }

  // Helper operations
  static async createDefaultEnvironments(workspaceId: string): Promise<Environment[]> {
    return invoke('create_default_environments', { workspaceId });
  }

  static async setActiveEnvironment(
    workspaceId: string,
    environmentId: string
  ): Promise<boolean> {
    return invoke('set_active_environment', {
      workspaceId,
      environmentId
    });
  }

  static async getActiveEnvironment(workspaceId: string): Promise<Environment | null> {
    return invoke('get_active_environment', { workspaceId });
  }

  // Batch operations for better performance
  static async bulkCreateVariables(
    environmentId: string,
    variables: EnvironmentVariable[]
  ): Promise<Environment> {
    let environment = await this.getEnvironment(environmentId);
    if (!environment) {
      throw new Error(`Environment not found: ${environmentId}`);
    }

    for (const variable of variables) {
      environment = await this.addVariable(environmentId, variable);
    }

    return environment;
  }

  static async bulkUpdateVariables(
    environmentId: string,
    variables: EnvironmentVariable[]
  ): Promise<Environment> {
    let environment = await this.getEnvironment(environmentId);
    if (!environment) {
      throw new Error(`Environment not found: ${environmentId}`);
    }

    for (const variable of variables) {
      environment = await this.updateVariable(environmentId, variable);
    }

    return environment;
  }

  static async duplicateEnvironment(
    sourceEnvironmentId: string,
    newName: string,
    workspaceId: string
  ): Promise<Environment> {
    const sourceEnvironment = await this.getEnvironment(sourceEnvironmentId);
    if (!sourceEnvironment) {
      throw new Error(`Source environment not found: ${sourceEnvironmentId}`);
    }

    // Generate a unique name if not provided
    const finalName = newName || this.generateUniqueEnvironmentName(sourceEnvironment.name);

    // Create new environment
    const newEnvironment = await this.createEnvironment(
      workspaceId,
      finalName
    );

    // Copy all variables
    const variables = Object.values(sourceEnvironment.variables);
    if (variables.length > 0) {
      await this.bulkCreateVariables(newEnvironment.id, variables);
    }

    return await this.getEnvironment(newEnvironment.id) || newEnvironment;
  }

  // Helper method to generate unique environment names
  private static generateUniqueEnvironmentName(baseName: string): string {
    // Remove existing "(Copy)" suffixes to avoid multiple copies
    const cleanName = baseName.replace(/\s*\(Copy\)(\s*\(Copy\))*/g, '');
    return `${cleanName} (Copy)`;
  }
}