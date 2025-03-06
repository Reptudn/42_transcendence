import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import oauthPlugin from "@fastify/oauth2";
import { OAuth2Namespace } from "@fastify/oauth2";

declare module "fastify" {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
  }
}

const googleOAuthPlugin: FastifyPluginAsync = async (fastify, opts) => {
  fastify.register(oauthPlugin, {
    name: 'googleOAuth2',
    scope: ['profile', 'email'],
    callbackUri: (req: { protocol: string; hostname: string; }) => `${req.protocol}://${req.hostname}/api/auth/google/callback`,
    credentials: {
      client: {
        id: process.env.GOOGLE_OAUTH_CLIENT_ID,
        secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      },
      auth: oauthPlugin.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: 'api/auth/google',
    callbackUriParams: {
      access_type: "offline",
      prompt: "consent",
    },
  });

};

export default fp(googleOAuthPlugin, {
  name: "plugin-google-oauth",
});