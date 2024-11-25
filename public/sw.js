import { precacheAndRoute } from 'workbox-precaching'

const seed = 'ariake.concrnt.net'; // TODO: find a way to sync with the main app

const resolveHost = async (ccid) => {
    const response = await fetch(`https://${seed}/api/v1/entity/${ccid}`);
    const data = await response.json();
    const content = data.content;
    return content.domain;
}

const getProfile = async (ccid) => {
    const host = await resolveHost(ccid);
    const response = await fetch(`https://${host}/api/v1/profile/${ccid}/world.concrnt.p`);
    const data = await response.json();
    const document = JSON.parse(data.content.document);
    return document;
}

const getMessage = async (id, owner) => {
    const host = await resolveHost(owner);
    const response = await fetch(`https://${host}/api/v1/message/${id}`);
    const data = await response.json();
    const document = JSON.parse(data.content.document);
    return document;
}

self.addEventListener('push', async event => {
    console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

    const document = event.data.json();

    let title = '';
    let body = '';

    const signer = await getProfile(document.signer);

    switch (document.schema) {
        case Schemas.likeAssociation: { // Like
            title = `${signer.body.username} さんがあなたの投稿にいいねしました`;
            const message = await getMessage(document.target, document.owner);
            body = message.body.body;

            break
        }
        case Schemas.reactionAssociation: { // Reaction
            title = `${signer.body.username} さんがあなたの投稿にリアクションしました :${document.body.shortcode}:`;
            const message = await getMessage(document.target, document.owner);
            body = message.body.body;

            break;
        }
        case Schemas.rerouteAssociation: { // Reroute
            title = `${signer.body.username} さんがあなたの投稿をリルートしました`;
            const message = await getMessage(document.target, document.owner);
            body = message.body.body;

            break;
        }
        case Schemas.replyAssociation: { // Reply
            title = `${signer.body.username} さんがあなたの投稿にリプライしました`;
            const message = await getMessage(document.body.messageId, document.body.messageAuthor);
            body = message.body.body;

            break;
        }
        case Schemas.mentionAssociation: { // Mention
            title = `${signer.body.username} さんがあなたをメンションしました`;
            const message = await getMessage(document.target, document.owner);
            body = message.body.body;

            break;
        }
        case Schemas.readAccessRequestAssociation: { // Read Access Request
            title = `${signer.body.username} さんが閲覧リクエストを送信しています`;
            break;
        }

        default:
            break;
    }

    event.waitUntil(
        self.registration.showNotification(
            title, {
                body
            }
        )
    );
});

self.addEventListener('install', _event => {
    self.skipWaiting();
    console.log('Service Worker installed');
})

const Schemas = {
    markdownMessage:     'https://schema.concrnt.world/m/markdown.json',
    replyMessage:        'https://schema.concrnt.world/m/reply.json',
    rerouteMessage:      'https://schema.concrnt.world/m/reroute.json',
    plaintextMessage:    'https://schema.concrnt.world/m/plaintext.json',
    mediaMessage:        'https://schema.concrnt.world/m/media.json',

    likeAssociation:     'https://schema.concrnt.world/a/like.json',
    mentionAssociation:  'https://schema.concrnt.world/a/mention.json',
    replyAssociation:    'https://schema.concrnt.world/a/reply.json',
    rerouteAssociation:  'https://schema.concrnt.world/a/reroute.json',
    reactionAssociation: 'https://schema.concrnt.world/a/reaction.json',
    upgradeAssociation:  'https://schema.concrnt.world/a/upgrade.json',
    readAccessRequestAssociation:  'https://schema.concrnt.world/a/readaccessrequest.json',

    profile:             'https://schema.concrnt.world/p/main.json',

    communityTimeline:   'https://schema.concrnt.world/t/community.json',
    emptyTimeline:       'https://schema.concrnt.world/t/empty.json',
    subprofileTimeline:  'https://schema.concrnt.world/t/subprofile.json',

    listSubscription:    'https://schema.concrnt.world/s/list.json',

}

precacheAndRoute(self.__WB_MANIFEST)

