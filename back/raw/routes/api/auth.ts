import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  getUserById,
  loginUser,
  registerGoogleUser,
  registerUser,
  updateUserProfile,
  printDatabase,
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

  console.log("Google OAuth enabled");

  // google oauth

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

    const dbUser = undefined; // actually get the user
    if (!dbUser) {
      console.log("Registering user");
      console.log("User", user);
      await registerGoogleUser(user);
      // await updateUserProfile(user.email, user.given_name, user.family_name, user.picture);
    }
    const jwt = app.jwt.sign(
      { username: user.email, id: user.id },
      { expiresIn: "10d" }
    );
    console.log("Created JWT", jwt);
    reply.setCookie("token", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    reply.redirect("/partial/pages/profile");
  });
}

export async function checkAuth(
  request: any,
  throwErr: boolean = false
): Promise<User | null> {
  console.log("Checking auth");
  console.log(request.cookies.token);

  try {
    await request.jwtVerify();
    return getUserById(request.user.id);
  } catch (error) {
    console.log("Error", error);
    if (throwErr) {
      throw new Error("Unauthorized");
    }
    return null;
  }
}
