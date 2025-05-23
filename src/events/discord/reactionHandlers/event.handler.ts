import { EmbedBuilder, Guild, MessageReaction, User } from 'discord.js';
import { Botrucho, IEventData } from '@/mongodb';
import { EventKeys, TranslationElement } from '@/types';
import { logger } from '@/utils';

export class EventHandler {
  private client: Botrucho;
  private reaction: MessageReaction;
  private user: User;

  constructor(client: Botrucho, reaction: MessageReaction, user: User) {
    this.client = client;
    this.reaction = reaction;
    this.user = user;
  }

  handleEventReaction = async () => {
    if (this.reaction.emoji.name === '👽') {
      const guild: Guild | null = this.reaction.message.guild;
      if (!guild) return;
      const eventInfo: IEventData | null = await guild.fetchEventDB(this.client.eventData, this.reaction.message.id);
      if (eventInfo) {
        const userFind: string | undefined = eventInfo.userAssisting ? eventInfo.userAssisting.find((userID: string) => userID === this.user.id) : undefined;
        if (!userFind) {
          await this.client.eventData.addAssistance(eventInfo.id, this.user.id);

          const {
            ASSISTANCE_CONFIRMED,
            INVITATION_LINK,
            EVENT_GENERATED
          }: TranslationElement<EventKeys> = await guild.translate('EVENT', this.client.guildData);

          const exampleEmbed: EmbedBuilder = new EmbedBuilder()
            .setColor(this.client.config.color)
            .setTitle(ASSISTANCE_CONFIRMED.replace('${eventName}', eventInfo.eventName))
            .setURL(eventInfo.calendarLink)
            .setDescription(INVITATION_LINK.replace('${calendarLink}', eventInfo.calendarLink))
            .setTimestamp()
            .setFooter({
              text: EVENT_GENERATED.replace('${username}', this.client.user?.username ?? 'Bot'),
              iconURL: this.client.user?.displayAvatarURL({
                size: 512
              }) ?? undefined
            });

          this.user.send({
            embeds: [exampleEmbed]
          })
            .then(msg => {
              setTimeout(() => {
                this.client.deleted_messages.add(msg);
              }, 120000)
            })
            .catch(() => {
              logger.log('I couldn\'t send a DM');
            });
        }
      }
    }
  }
}
