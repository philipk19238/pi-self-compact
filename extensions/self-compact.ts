import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

function triggerSelfCompact(ctx: ExtensionContext, customInstructions?: string) {
	if (ctx.hasUI) {
		ctx.ui.notify("Self-compaction started", "info");
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
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "self_compact",
		label: "Self Compact",
		description: "Trigger pi session compaction with optional focus instructions.",
		promptSnippet: "Trigger session compaction when context is stale, noisy, or too large.",
		promptGuidelines: [
			"Use self_compact when conversation context is stale, noisy, or too large and a focused summary would improve future turns.",
			"When calling self_compact, include concise customInstructions describing what to preserve and what to discard.",
		],
		parameters: Type.Object({
			customInstructions: Type.Optional(
				Type.String({
					description: "Optional instructions for what the compaction summary should preserve or emphasize.",
				}),
			),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			triggerSelfCompact(ctx, params.customInstructions?.trim() || undefined);
			return {
				content: [{ type: "text", text: "Self-compaction has been started." }],
				details: { customInstructions: params.customInstructions ?? null },
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
