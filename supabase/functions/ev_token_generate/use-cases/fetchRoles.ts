import createClient from "../supabase/index.ts";

export async function fetchRoles(userId: number): Promise<string[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("ev_member_role")
        .select("role")
        .eq("member_id", userId);

    if (error) {
        console.error(error);
        return [];
    }

    return [...new Set(data?.map((x:{role:string}) => x.role))] ?? [];
}
