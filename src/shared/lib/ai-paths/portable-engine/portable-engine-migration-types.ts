import type { AiPathPortablePackage, PortablePathInputSource } from './portable-engine-contract';

export type PortablePathMigrationWarningCode =
  | 'removed_trigger_context_modes_normalized'
  | 'path_config_upgraded'
  | 'semantic_canvas_upgraded'
  | 'portable_package_version_upgraded'
  | 'package_envelope_signature_missing'
  | 'package_envelope_signature_mismatch'
  | 'package_envelope_signature_unsupported_algorithm'
  | 'package_envelope_signature_async_required'
  | 'package_envelope_signature_verification_unavailable'
  | 'package_envelope_signature_key_missing'
  | 'package_path_id_mismatch'
  | 'package_name_mismatch'
  | 'package_fingerprint_missing'
  | 'package_fingerprint_mismatch'
  | 'package_fingerprint_unsupported_algorithm'
  | 'package_fingerprint_async_required'
  | 'package_fingerprint_verification_unavailable'
  | 'node_code_object_manifest_invalid'
  | 'node_code_object_hash_missing'
  | 'node_code_object_hash_mismatch'
  | 'node_code_object_hash_unknown_node_type';

type PortablePathDiagnosticMessage<TCode extends string> = {
  code: TCode;
  message: string;
};

export type PortablePathMigrationWarning =
  PortablePathDiagnosticMessage<PortablePathMigrationWarningCode>;

export type MigratePortablePathInputResult =
  | {
      ok: true;
      value: {
        source: PortablePathInputSource;
        portablePackage: AiPathPortablePackage;
        migrationWarnings: PortablePathMigrationWarning[];
      };
    }
  | { ok: false; error: string };
