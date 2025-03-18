import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  getUserById,
  loginUser,
  registerGoogleUser,
  registerUser,
  updateUserProfile,
  printDatabase,
  getGoogleUser,
  loginGoogleUser,
} from "../../db/db_users.js";
import { unlockAchievement } from "../../db/db_achievements.js";
import { User } from "../../db/database.js";
import { OAuth2Namespace } from "@fastify/oauth2";
import { getGoogleProfile, GoogleUserInfo } from "./google.js";

declare module "fastify" {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/login", async (req: any, reply: any) => {
    const { username, password } = req.body;
    try {
      const user: User = await loginUser(username, password);
      const token = app.jwt.sign(
        { username: user.username, id: user.id },
        { expiresIn: "10d" }
      );
      await unlockAchievement(user.id, "login");
      reply.setCookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });
    } catch (error) {
      if (error instanceof Error) {
        reply.code(400).send({ message: error.message });
      } else {
        reply.code(400).send({ message: "An unknown error occurred" });
      }
      return;
    }
  });
  app.post("/api/logout", async (req: any, reply: any) => {
    reply.clearCookie("token", { path: "/" });
    reply.send({ message: "Logged out successfully" });
  });
  app.post("/api/register", async (req: any, reply: any) => {
    const { username, password, displayname } = req.body;
    try {
      await registerUser(username, password, displayname);
      reply.code(200).send({ message: "User registered" });
    } catch (error) {
      if (error instanceof Error) {
        reply.code(400).send({ message: error.message });
      } else {
        reply.code(400).send({ message: "An unknown error occurred" });
      }
      return;
    }
  });

  app.get("/api/auth/google/callback", async (req: any, reply: any) => {
    const { token } =
      await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
    let user: GoogleUserInfo;
    try {
      user = await getGoogleProfile(token.access_token);
    } catch (error) {
      reply.send("Something went wrong");
      return;
    }

    const dbUser = await getGoogleUser(user.id);
    console.log("DB User", dbUser);
    if (dbUser === null) {
      console.log("Registering user");
      console.log("User", user);
      try {
        console.log("Registering Google User...");
        await registerGoogleUser(user);
        console.log("Registered Google User!");
      } catch (error) {
        console.log("Error Google Register", error);
        reply.send(error);
        return;
      }
    }

    try {
      console.log("Google user id:", user.id);
      const loggedGoogleUser = await loginGoogleUser(user.id);

      const jwt = app.jwt.sign(
        { username: loggedGoogleUser.username, id: loggedGoogleUser.id },
        { expiresIn: "10d" }
      );
      await unlockAchievement(loggedGoogleUser.id, "login");
      reply.setCookie("token", jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        path: "/",
      });
      reply.redirect("/partial/pages/profile");
    } catch (error) {
      console.log("Error Google Login", error);
      reply.send(error);
      return;
    }
  });
}

export async function checkAuth(
  request: any,
  throwErr: boolean = false
): Promise<User | null> {
  console.log("Checking auth");
  console.log("Cookies:", request.cookies);

  try {
    await request.jwtVerify(); // INFO: if this throws an exception its probably because the old token is still in the browser and the new jwt secret is now different
    return getUserById(request.user.id);
  } catch (error) {
    console.log("Error", error);
    if (throwErr) {
      throw new Error("Unauthorized");
    }
    return null;
  }
}
