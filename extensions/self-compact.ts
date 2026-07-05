import type { CompactionResult, ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

// The summary the agent wrote for its own compaction, handed from the tool call
// to the before-compact hook. Undefined means "let the default summarizer run".
let pendingSummary: string | undefined;

/** Split fileOps into sorted read-only / modified lists (mirrors the default compaction). */
function fileLists(fileOps: { read: Set<string>; written: Set<string>; edited: Set<string> }) {
	const modified = new Set<string>([...fileOps.edited, ...fileOps.written]);
	return {
		readFiles: [...fileOps.read].filter((f) => !modified.has(f)).sort(),
		modifiedFiles: [...modified].sort(),
	};
}

function fileFooter(readFiles: string[], modifiedFiles: string[]): string {
	const sections: string[] = [];
	if (readFiles.length) sections.push(`<read-files>\n${readFiles.join("\n")}\n</read-files>`);
	if (modifiedFiles.length) sections.push(`<modified-files>\n${modifiedFiles.join("\n")}\n</modified-files>`);
	return sections.length ? `\n\n${sections.join("\n\n")}` : "";
}

function startCompaction(ctx: ExtensionContext, summary?: string) {
	pendingSummary = summary;
	if (ctx.hasUI) {
		ctx.ui.notify("Compacting context…", "info");
	}
	ctx.compact({
		onComplete: () => {
			if (ctx.hasUI) {
				ctx.ui.notify("Context compacted", "info");
			}
		},
		onError: (error) => {
			// Compaction can throw before the hook fires (e.g. session too small);
			// drop the staged summary so it can't leak into a later compaction.
			pendingSummary = undefined;
			if (ctx.hasUI) {
				ctx.ui.notify(`Compaction failed: ${error.message}`, "error");
			}
		},
	});
}

export default function (pi: ExtensionAPI) {
	// When the agent supplied its own summary, use it verbatim as the compacted
	// context instead of running the default summarizer over the old messages.
	pi.on("session_before_compact", (event) => {
		if (event.reason !== "manual" || pendingSummary === undefined) return;
		const summary = pendingSummary;
		pendingSummary = undefined;
		const { readFiles, modifiedFiles } = fileLists(event.preparation.fileOps);
		const compaction: CompactionResult = {
			summary: summary + fileFooter(readFiles, modifiedFiles),
			firstKeptEntryId: event.preparation.firstKeptEntryId,
			tokensBefore: event.preparation.tokensBefore,
			details: { readFiles, modifiedFiles },
		};
		return { compaction };
	});

	pi.registerTool({
		name: "self_compact",
		label: "Self Compact",
		description:
			"Compress your own context. You write a summary of the work so far; it replaces the older messages while your most recent turns are kept, and you continue on the smaller context. Ends the current turn — you resume on your summary.",
		promptSnippet: "Compress your own context by writing a summary that replaces older history.",
		promptGuidelines: [
			"This is yours to drive: you decide when your context needs compressing and you write exactly what survives. Write the summary as a handoff to your future self — the goal, what's done, what's next, and any hard-won detail you'd regret losing (exact paths, names, errors, decisions, dead ends). Whatever you leave out is gone.",
			"Light cues for a good moment: old exploration or large tool outputs have become dead weight, or a chunk of work just finished or was abandoned. There's no threshold to wait for — a natural pause is enough.",
			"Calling it ends the current turn and reloads you on your summary, so make it your final action at a pause, not something mid-task. Omit the summary only if you'd rather have one generated for you.",
		],
		parameters: Type.Object({
			summary: Type.Optional(
				Type.String({
					description:
						"The summary that will replace the older conversation — written by you as a checkpoint to continue from. Include everything you'll need and leave out the noise. Omit to have one generated instead.",
				}),
			),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const summary = params.summary?.trim() || undefined;
			startCompaction(ctx, summary);
			return {
				content: [
					{
						type: "text",
						text: summary
							? "Compacting: your summary replaces the older history. This ends the current turn; you resume on it with recent turns kept."
							: "Compacting with a generated summary. This ends the current turn; you resume on it with recent turns kept.",
					},
				],
				details: { authored: summary !== undefined },
			};
		},
	});

	pi.registerCommand("self-compact", {
		description: "Compact the session — pass a summary to use, or leave empty to generate one",
		handler: async (args, ctx) => {
			startCompaction(ctx, args.trim() || undefined);
		},
	});
}
