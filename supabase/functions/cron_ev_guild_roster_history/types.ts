export type GuildRosterResponse = {
  guild: {
    id: number;
    name: string;
    realm: {
      id: number;
      name: string;
      slug: string;
    };
  };
  members: {
    character: {
      id: number;
      name: string;

      level: number;
      realm: {
        id: number;
        name: string;
        slug: string;
      };
      avatar: string;
      playable_class: {
        id: number;
        name?: string;
      };
      playable_race: {
        id: number;
      };
      character_class: {
        id: number;
      };
      last_login_timestamp: number;
    };
    rank: number;
  }[];
};

export type SupabaseMemberResponse = {
  character: {
    id: number;
    name: string;
    guild: {
      id: number;
      name: string;
    };
    level: number;
    realm: {
      id: number;
      name: string;
      slug: string;
    };
    avatar: string;
    playable_class: {
      name: string;
    };
    character_class: {
      name: string;
    };
    last_login_timestamp: number;
  };
};
