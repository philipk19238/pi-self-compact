import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

/** Human-readable context usage, e.g. "42%", or undefined if pi can't estimate it yet. */
function contextPercent(ctx: ExtensionContext): string | undefined {
	const usage = ctx.getContextUsage();
	if (!usage || usage.percent == null) return undefined;
	return `${Math.round(usage.percent)}%`;
}

function triggerSelfCompact(ctx: ExtensionContext, customInstructions?: string): string | undefined {
	const before = contextPercent(ctx);

	if (ctx.hasUI) {
		ctx.ui.notify(before ? `Self-compaction started (context at ${before})` : "Self-compaction started", "info");
	}

	ctx.compact({
		customInstructions,
		onComplete: () => {
			if (ctx.hasUI) {
				ctx.ui.notify("Self-compaction completed", "info");
			}
		},
		onError: (error) => {
			if (ctx.hasUI) {
				ctx.ui.notify(`Self-compaction failed: ${error.message}`, "error");
			}
		},
	});

	return before;
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "self_compact",
		label: "Self Compact",
		description:
			"Compact the current session: older conversation history is replaced by a structured summary while recent turns are kept. This ENDS the current turn — it aborts the in-flight response, then reloads the session on the compacted context. Compaction is lossy and costs a model call, so trigger it deliberately when work has reached a natural pause, not mid-task.",
		promptSnippet: "Compact your own context at a natural pause when older history has become dead weight (ends the current turn).",
		promptGuidelines: [
			"pi already auto-compacts when the context window fills up. Use self_compact to compact EARLIER and at a cleaner point — when the recent exploration has become dead weight — so the summary lands on a natural boundary instead of auto-compaction firing mid-task.",
			"Calling self_compact ENDS the current turn: it aborts the in-flight response, summarizes older history, and reloads the session. Call it as your final action when work has reached a natural pause — never in the middle of a task you intend to keep working on in the same turn.",
			"Good moments: a chunk of work is finished and the debugging/exploration that produced it no longer matters; you've accumulated large tool outputs (long file reads, logs, search dumps) whose conclusions you've already extracted; you abandoned an approach and only 'don't retry X' is worth keeping. Trust your own judgment on timing — there is no threshold, and nothing forces or blocks the call.",
			"Set customInstructions to only what is SPECIFIC to this session that a generic summarizer would drop or under-weight — e.g. 'keep the exact derived config schema verbatim', 'record that approach X via Y failed with error Z', 'discard the initial repo tour'. The default summary already preserves goals, constraints, progress, decisions, next steps, file paths, and error messages, so do NOT restate those.",
		],
		parameters: Type.Object({
			customInstructions: Type.Optional(
				Type.String({
					description:
						"Session-specific focus for the summary: what to preserve verbatim or what to discard, beyond the default (goals, constraints, progress, decisions, next steps, file paths, errors). Leave empty to use the default summary as-is.",
				}),
			),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const instructions = params.customInstructions?.trim() || undefined;
			const before = triggerSelfCompact(ctx, instructions);
			return {
				content: [
					{
						type: "text",
						text: before
							? `Self-compaction started (context was at ${before}). This ends the current turn; the session reloads on the compacted context with recent turns preserved.`
							: "Self-compaction started. This ends the current turn; the session reloads on the compacted context with recent turns preserved.",
					},
				],
				details: { customInstructions: instructions ?? null, contextBefore: before ?? null },
			};
		},
	});

	pi.registerCommand("self-compact", {
		description: "Trigger session compaction with optional focus instructions",
		handler: async (args, ctx) => {
			triggerSelfCompact(ctx, args.trim() || undefined);
		},
	});
}
