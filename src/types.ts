export type ServerContext = {
  accessToken: string;
  organizationSlug: string | null;
};

export type WorkerProps = ServerContext & {
  id: string;
  name: string;
};
