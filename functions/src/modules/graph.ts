import * as functions from 'firebase-functions';
import { GraphQLClient } from 'graphql-request';

const gql = String.raw;

// ********************************************************* //

const endpoint = functions.config().graph.endpoint;
const client = new GraphQLClient(endpoint, {
  headers: {
    authorization: `Bearer ${functions.config().graph.token}`
  }
});

// ********************************************************* //

interface registerUserPayload {
  newPerson: {
    uid: String;
  };
}

interface registerUserWithGraph {
  uid: string;
}

export const registerUserWithGraph = (payload: registerUserWithGraph) => {
  const query = gql`
    mutation createPerson($uid: ID!) {
      newPerson: CreatePerson(input: { uid: $uid }) {
        uid
      }
    }
  `;

  return client
    .request<registerUserPayload>(query, payload)
    .then(({ newPerson: uid }) => uid);
};

// ********************************************************* //

interface sendNotificationsPayload {
  direct: string[];
  indirect: string[];
}

export enum ContactNature {
  Direct = 0,
  Indirect = 1
}

export interface Notification {
  uid: string;
  contactNature: ContactNature;
}

export const collectNotificationsFromGraph = async (payload: {
  uid: string;
}) => {
  const query = gql`
    query RecentContactsForUser($uid: ID!) {
      direct: RecentDirectContactsForPerson(input: { uid: $uid }) {
        uid
      }
      indirect: RecentIndirectContactsForPerson(input: { uid: $uid }) {
        uid
      }
    }
  `;

  const { direct, indirect } = await client.request<sendNotificationsPayload>(
    query,
    payload
  );

  const allContacts = [
    ...direct.map(
      (uid: string) =>
        ({ uid, contactNature: ContactNature.Direct } as Notification)
    ),
    ...indirect.map(
      (uid: string) =>
        ({ uid, contactNature: ContactNature.Indirect } as Notification)
    )
  ];

  return allContacts;
};
