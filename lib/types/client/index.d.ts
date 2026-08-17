import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/** Required services: the slot registry and the locale registry. */
export declare const inject: string[];
/**
 * Client plugin body: register the dictionaries, then contribute the toast
 * into `shell.overlay` and the sound toggle into the General settings section.
 * Both slot contributions ride `slots.inject`, so they wait for their target
 * slots to be declared and are torn down automatically on plugin unload.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map