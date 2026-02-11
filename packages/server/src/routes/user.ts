
import bcrypt from 'bcryptjs';
import assert, { AssertionError } from 'assert';
import jwt from 'jwt-simple';
import { Types } from '@fiora/database/mongoose';
import config from '@fiora/config/server';
import logger from '@fiora/utils/logger';
import getRandomAvatar, { getDefaultAvatar } from '@fiora/utils/getRandomAvatar';
import { SALT_ROUNDS } from '@fiora/utils/const';
import User, { UserDocument } from '@fiora/database/mongoose/models/user';
import Group, { GroupDocument } from '@fiora/database/mongoose/models/group';
import Friend, { FriendDocument } from '@fiora/database/mongoose/models/friend';
import Socket from '@fiora/database/mongoose/models/socket';
import Message, { handleInviteV2Messages } from '@fiora/database/mongoose/models/message';
import Notification from '@fiora/database/mongoose/models/notification';
import History from '@fiora/database/mongoose/models/history';
import { io } from '../app';
import { authenticateWithLdap } from '../utils/ldap';

// Sanitize input function to prevent XSS and SQL injection
function sanitizeInput(input: string): string {
    return input.replace(/[^a-zA-Z0-9_-]/g, '');  // Restrict to safe characters
}

// Example of user creation route with sanitization
async function createUser(username: string, password: string) {
    const sanitizedUsername = sanitizeInput(username);  // Sanitize input
    const sanitizedPassword = sanitizeInput(password);  // Sanitize input

    // Hash password using bcrypt
    const hashedPassword = await bcrypt.hash(sanitizedPassword, SALT_ROUNDS);

    // Insert sanitized user into database
    const newUser = new User({
        username: sanitizedUsername,
        password: hashedPassword
    });

    await newUser.save();
    return newUser;
}

