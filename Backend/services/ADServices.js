import ActiveDirectory from 'activedirectory2';
import { env } from '../config/env.js';

function getAdClient() {
  if (env.authMode !== 'ldap') {
    throw new Error('LDAP authentication is disabled. Set AUTH_MODE=ldap to enable it.');
  }
  const required = ['LDAP_URL', 'LDAP_BASE_DN', 'LDAP_BIND_DN', 'LDAP_BIND_PASSWORD'];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`${key} is required when AUTH_MODE=ldap.`);
  }
  return new ActiveDirectory({
    url: process.env.LDAP_URL,
    baseDN: process.env.LDAP_BASE_DN,
    username: process.env.LDAP_BIND_DN,
    password: process.env.LDAP_BIND_PASSWORD,
  });
}

export function toLdapPrincipal(username) {
  if (username.includes('@') || username.includes('\\')) return username;
  const domain = process.env.LDAP_DOMAIN;
  if (!domain) throw new Error('LDAP_DOMAIN is required when AUTH_MODE=ldap.');
  return `${username}@${domain}`;
}

export function authenticateUser(username, password) {
  const ad = getAdClient();
  return new Promise((resolve, reject) => {
    ad.authenticate(username, password, (err, auth) => err ? reject(err) : resolve(Boolean(auth)));
  });
}

export function getUser(username) {
  const ad = getAdClient();
  return new Promise((resolve, reject) => {
    ad.findUser(username, (err, user) => {
      if (err) return reject(err);
      resolve(user || null);
    });
  });
}

export function getUsersForGroup(groupName) {
  const ad = getAdClient();
  return new Promise((resolve, reject) => {
    ad.getUsersForGroup(groupName, (err, users) => err ? reject(err) : resolve(users || []));
  });
}

export function searchUsers(filter) {
  const ad = getAdClient();
  return new Promise((resolve, reject) => {
    ad.findUsers(filter, true, (err, users) => err ? reject(err) : resolve(users || []));
  });
}

export function getAllUsers() {
  return searchUsers('(objectClass=user)');
}
