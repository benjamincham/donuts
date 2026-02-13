#!/usr/bin/env node

/**
 * AgentCore Client CLI
 * Main entry point
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from './config/index.js';
import { pingCommand } from './commands/ping.js';
import { invokeCommand, interactiveMode } from './commands/invoke.js';
import { configCommand, tokenInfoCommand, listProfilesCommand } from './commands/config.js';

const program = new Command();

// Program information
program.name('agentcore-client').description('CLI client for AgentCore Runtime').version('0.1.0');

// Global options
program
  .option('--endpoint <url>', 'エンドポイントURL')
  .option('--json', 'Output in JSON format')
  .option('--machine-user', 'マシンユーザー認証を使用')
  .option('--target-user <userId>', '対象ユーザーID（マシンユーザーモード時）');

// Ping command
program
  .command('ping')
  .description('Agent のヘルスチェック')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const globalOptions = program.opts();
      const config = loadConfig();

      // Override config with options
      if (globalOptions.endpoint) {
        config.endpoint = globalOptions.endpoint;
        // Re-evaluate Runtime when endpoint changes
        config.isAwsRuntime =
          config.endpoint.includes('bedrock-agentcore') && config.endpoint.includes('/invocations');
      }

      await pingCommand(config, {
        json: options.json || globalOptions.json,
      });
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Invoke command
program
  .command('invoke')
  .description('Send prompt to Agent')
  .argument('<prompt>', 'Prompt to send')
  .option('--json', 'Output in JSON format')
  .option('--session-id <id>', 'Session ID (used for conversation continuation)')
  .option('--no-auth', 'Execute without authentication')
  .action(async (prompt, options) => {
    try {
      const globalOptions = program.opts();
      const config = loadConfig();

      // Override config with options
      if (globalOptions.endpoint) {
        config.endpoint = globalOptions.endpoint;
        // Re-evaluate Runtime when endpoint changes
        config.isAwsRuntime =
          config.endpoint.includes('bedrock-agentcore') && config.endpoint.includes('/invocations');
      }

      // Override options for machine user mode
      if (globalOptions.machineUser) {
        config.authMode = 'machine';
      }
      if (globalOptions.targetUser && config.machineUser) {
        config.machineUser.targetUserId = globalOptions.targetUser;
      }

      // Determine session ID: CLI > Environment variable
      const sessionId = options.sessionId || process.env.SESSION_ID;

      await invokeCommand(prompt, config, {
        json: options.json || globalOptions.json,
        sessionId,
      });
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Interactive command
program
  .command('interactive')
  .alias('i')
  .description('Interact with Agent in interactive mode')
  .action(async () => {
    try {
      const globalOptions = program.opts();
      const config = loadConfig();

      // Override config with options
      if (globalOptions.endpoint) {
        config.endpoint = globalOptions.endpoint;
        // Re-evaluate Runtime when endpoint changes
        config.isAwsRuntime =
          config.endpoint.includes('bedrock-agentcore') && config.endpoint.includes('/invocations');
      }

      // Override options for machine user mode
      if (globalOptions.machineUser) {
        config.authMode = 'machine';
      }
      if (globalOptions.targetUser && config.machineUser) {
        config.machineUser.targetUserId = globalOptions.targetUser;
      }

      await interactiveMode(config);
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Display and manage settings')
  .option('--validate', 'Validate settings')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      const globalOptions = program.opts();

      await configCommand({
        json: options.json || globalOptions.json,
        endpoint: globalOptions.endpoint,
        validate: options.validate,
      });
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Token command
program
  .command('token')
  .description('Display JWT token information')
  .option('--machine', 'Display machine user token')
  .action(async (options) => {
    try {
      const globalOptions = program.opts();
      const config = loadConfig();

      // Override config with options
      if (globalOptions.endpoint) {
        config.endpoint = globalOptions.endpoint;
        // Re-evaluate Runtime when endpoint changes
        config.isAwsRuntime =
          config.endpoint.includes('bedrock-agentcore') && config.endpoint.includes('/invocations');
      }

      // Override options for machine user mode
      if (options.machine || globalOptions.machineUser) {
        config.authMode = 'machine';
      }

      await tokenInfoCommand(config);
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Runtimes command (formerly Profiles)
program
  .command('runtimes')
  .alias('profiles') // Backward compatibility
  .description('List available runtimes')
  .action(() => {
    try {
      listProfilesCommand();
    } catch (error) {
      console.error(
        chalk.red(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
      process.exit(1);
    }
  });

// Default action (when no arguments provided)
program.action(() => {
  console.log(chalk.cyan('🤖 AgentCore Client'));
  console.log('');
  console.log('Usage:');
  console.log('  agentcore-client <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  ping              Health check for Agent');
  console.log('  invoke <prompt>   Send prompt to Agent');
  console.log('  interactive       Interactive mode');
  console.log('  config            Display and manage settings');
  console.log('  token             JWT token information');
  console.log('  runtimes          List runtimes');
  console.log('');
  console.log('Examples:');
  console.log('  agentcore-client invoke "Hello, what is 1+1?"');
  console.log('  agentcore-client ping --endpoint http://localhost:3000');
  console.log('  agentcore-client config --validate');
  console.log('');
  console.log('Environment variable settings:');
  console.log('  AGENTCORE_ENDPOINT       Local endpoint');
  console.log('  AGENTCORE_RUNTIME_ARN    AWS Runtime ARN');
  console.log('  AGENTCORE_REGION         AWS Region');
  console.log('  AUTH_MODE                Authentication mode (user | machine)');
  console.log('');
  console.log('Machine user authentication:');
  console.log('  COGNITO_DOMAIN           Cognito domain');
  console.log('  MACHINE_CLIENT_ID        Machine client ID');
  console.log('  MACHINE_CLIENT_SECRET    Machine client secret');
  console.log('  TARGET_USER_ID           Target user ID');
  console.log('  COGNITO_SCOPE            OAuth scope (optional)');
  console.log('');
  console.log('Detailed help:');
  console.log('  agentcore-client --help');
  console.log('  agentcore-client <command> --help');
});

// Error handling
program.configureHelp({
  sortSubcommands: true,
});

program.showHelpAfterError();

// Program execution
try {
  program.parse(process.argv);

  // Show help when no arguments provided
  if (process.argv.length <= 2) {
    program.help();
  }
} catch (error) {
  console.error(
    chalk.red(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  );
  process.exit(1);
}
