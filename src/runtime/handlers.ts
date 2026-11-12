export function safeHandler<Args extends unknown[]>(
  execute: (...args: Args) => unknown,
  report: (error: unknown) => void,
): (...args: Args) => Promise<void> {
  return async (...args) => {
    try {
      await execute(...args);
    } catch (error) {
      report(error);
    }
  };
}

interface ErrorReplyTarget {
  deferred: boolean;
  replied: boolean;
  reply: (payload: { content: string; flags: 64 }) => Promise<unknown>;
  editReply: (payload: { content: string; embeds: [] }) => Promise<unknown>;
}

export async function replyWithError(
  interaction: ErrorReplyTarget,
  report: (error: unknown) => void,
): Promise<void> {
  const content = 'Something went wrong. Please try again later.';
  try {
    if (interaction.deferred || interaction.replied)
      await interaction.editReply({ content, embeds: [] });
    else await interaction.reply({ content, flags: 64 });
  } catch (error) {
    report(error);
  }
}
