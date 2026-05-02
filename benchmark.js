const n_dms = 50;
const network_latency = 50; // realistic ms ping to db

// Mock supabase client
const supabase = {
  from: (table) => {
    return {
      select: (cols) => {
        return {
          eq: (col, val) => {
            if (table === "profiles") {
              return {
                maybeSingle: async () => {
                  // simulate network latency
                  await new Promise((r) => setTimeout(r, network_latency));
                  return { data: { id: val, full_name: "User " + val } };
                }
              };
            }
            return {
              or: async () => {
                 return { data: Array.from({length: n_dms}).map((_, i) => ({id: `dm_${i}`, user1_id: 'me', user2_id: `user_${i}`})) };
              }
            };
          },
          in: (col, vals) => {
            if (table === "profiles") {
                return {
                    then: async (resolve) => {
                      // simulate network latency
                      await new Promise((r) => setTimeout(r, network_latency));
                      resolve({ data: vals.map(v => ({id: v, full_name: "User " + v})) });
                    }
                }
            }
          }
        }
      }
    }
  }
}

async function testCurrent() {
    const user = {id: 'me'};
    const activeWorkspaceId = 'w1';

    const { data: dmData } = await supabase
      .from("direct_messages")
      .select("id, user1_id, user2_id")
      .eq("workspace_id", activeWorkspaceId)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    const start = performance.now();

    const dmsWithProfiles = await Promise.all(
      dmData.map(async (dm) => {
        const otherUserId = dm.user1_id === user.id ? dm.user2_id : dm.user1_id;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", otherUserId)
          .maybeSingle();

        if (!profile) return null;

        return {
          id: dm.id,
          other_user: profile,
        };
      }),
    );

    const end = performance.now();
    console.log(`Current approach (N+1 parallel): ${end - start} ms`);
    return dmsWithProfiles;
}

async function testOptimized() {
    const user = {id: 'me'};
    const activeWorkspaceId = 'w1';

    const { data: dmData } = await supabase
      .from("direct_messages")
      .select("id, user1_id, user2_id")
      .eq("workspace_id", activeWorkspaceId)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    const start = performance.now();

    const otherUserIds = dmData.map((dm) =>
        dm.user1_id === user.id ? dm.user2_id : dm.user1_id
    );

    const profiles = await new Promise(resolve => supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", otherUserIds)
        .then(resolve)
    ).then(res => res.data);

    const profileMap = new Map(profiles.map(p => [p.id, p]));

    const dmsWithProfiles = dmData.map(dm => {
        const otherUserId = dm.user1_id === user.id ? dm.user2_id : dm.user1_id;
        const profile = profileMap.get(otherUserId);
        if (!profile) return null;
        return {
            id: dm.id,
            other_user: profile,
        };
    }).filter(Boolean);

    const end = performance.now();
    console.log(`Optimized approach (Single IN query): ${end - start} ms`);
    return dmsWithProfiles;
}

async function run() {
    await testCurrent();
    await testOptimized();
}

run();
