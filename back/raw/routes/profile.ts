import { FastifyInstance } from "fastify";
import { getUserById, updateUserProfile, updateUserPassword } from "../db/database.js";

export async function profileRoutes(app: FastifyInstance)
{
    app.post('/profile/edit', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
        const userId = req.user.id;
        try {
            const currentUser = await getUserById(userId);
            if (!currentUser) {
                return reply.code(404).send({ message: 'User not found' });
            }
    
            const { username, displayName, bio, oldPassword, newPassword, profile_picture } = req.body;
    
            if (profile_picture) {
                if (typeof profile_picture != 'string' || !profile_picture.startsWith('data:image/png;base64,')) {
                    return reply.code(400).send({ message: 'Invalid profile picture' });
                }
            }
    
            await updateUserProfile(userId, username, displayName, bio, profile_picture);
            await updateUserPassword(userId, oldPassword, newPassword);
    
            return reply.code(200).send({ message: 'Profile updated' });
        } catch (error) {
            if (error instanceof Error) {
                return reply.code(500).send({ message: error.message });
            } else {
                return reply.code(500).send({ message: 'An unknown error occurred' });
            }
        }
    });
}