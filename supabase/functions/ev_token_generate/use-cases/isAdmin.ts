import createClient from "../supabase/index.ts";

export async function isAdmin(userId: number): Promise<boolean> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("ev_admin")
        .select("id")
        .eq("id", userId)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(error);
        return false;
    }

    return !!data;
}
