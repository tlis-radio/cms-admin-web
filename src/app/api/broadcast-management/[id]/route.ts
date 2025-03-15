import { fetchDelete, fetchGet, fetchPut } from "@/utils/fetch-wrapper";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";

export const GET = withApiAuthRequired(
  async (_, context) => fetchGet({path: `/Broadcast/${context.params?.id}`, isAuthorized: true})
);

export const PUT = withApiAuthRequired(
  async (request, context) => fetchPut({path: `/Broadcast/${context.params?.id}`, body: request})
);

export const DELETE = withApiAuthRequired(
  async (_, context) => fetchDelete({path: `/Broadcast/${context.params?.id}`})
);