import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const PgSession = connectPgSimple(session);

/**
 * Session middleware factory.
 * - Uses Pg session store as example (connect-pg-simple).
 * - Ensures secure cookie settings in production.
 */
export function createSessionMiddleware() {
  const isProd = process.env.NODE_ENV === "production";

  const storeOptions = process.env.DATABASE_URL
    ? {
        conString: process.env.DATABASE_URL,
        // optional: tableName, ttl, etc.
      }
    : undefined;

  const sessionOptions: session.SessionOptions = {
    store: storeOptions ? new PgSession(storeOptions) : undefined,
    name: process.env.SESSION_NAME || "arus.sid",
    secret: process.env.SESSION_SECRET || "change_this_in_production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd, // requires HTTPS (and app.set('trust proxy', 1) if behind a proxy)
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  };

  return session(sessionOptions);
}

/**
 * Call this in your server bootstrap:
 *
 * if (process.env.NODE_ENV === 'production') {
 *   app.set('trust proxy', 1); // if behind a proxy like Heroku/Render
 * }
 * app.use(createSessionMiddleware());
 */