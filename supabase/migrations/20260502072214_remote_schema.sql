alter table "public"."direct_message_messages" drop column "forwarded";

alter table "public"."messages" drop column "forwarded";

grant delete on table "public"."admin_user_invites" to "anon";

grant insert on table "public"."admin_user_invites" to "anon";

grant references on table "public"."admin_user_invites" to "anon";

grant select on table "public"."admin_user_invites" to "anon";

grant trigger on table "public"."admin_user_invites" to "anon";

grant truncate on table "public"."admin_user_invites" to "anon";

grant update on table "public"."admin_user_invites" to "anon";

grant delete on table "public"."admin_user_invites" to "authenticated";

grant insert on table "public"."admin_user_invites" to "authenticated";

grant references on table "public"."admin_user_invites" to "authenticated";

grant select on table "public"."admin_user_invites" to "authenticated";

grant trigger on table "public"."admin_user_invites" to "authenticated";

grant truncate on table "public"."admin_user_invites" to "authenticated";

grant update on table "public"."admin_user_invites" to "authenticated";

grant delete on table "public"."admin_user_invites" to "service_role";

grant insert on table "public"."admin_user_invites" to "service_role";

grant references on table "public"."admin_user_invites" to "service_role";

grant select on table "public"."admin_user_invites" to "service_role";

grant trigger on table "public"."admin_user_invites" to "service_role";

grant truncate on table "public"."admin_user_invites" to "service_role";

grant update on table "public"."admin_user_invites" to "service_role";

grant delete on table "public"."broadcast_members" to "anon";

grant insert on table "public"."broadcast_members" to "anon";

grant references on table "public"."broadcast_members" to "anon";

grant select on table "public"."broadcast_members" to "anon";

grant trigger on table "public"."broadcast_members" to "anon";

grant truncate on table "public"."broadcast_members" to "anon";

grant update on table "public"."broadcast_members" to "anon";

grant delete on table "public"."broadcast_members" to "authenticated";

grant insert on table "public"."broadcast_members" to "authenticated";

grant references on table "public"."broadcast_members" to "authenticated";

grant select on table "public"."broadcast_members" to "authenticated";

grant trigger on table "public"."broadcast_members" to "authenticated";

grant truncate on table "public"."broadcast_members" to "authenticated";

grant update on table "public"."broadcast_members" to "authenticated";

grant delete on table "public"."broadcast_members" to "service_role";

grant insert on table "public"."broadcast_members" to "service_role";

grant references on table "public"."broadcast_members" to "service_role";

grant select on table "public"."broadcast_members" to "service_role";

grant trigger on table "public"."broadcast_members" to "service_role";

grant truncate on table "public"."broadcast_members" to "service_role";

grant update on table "public"."broadcast_members" to "service_role";

grant delete on table "public"."broadcast_messages" to "anon";

grant insert on table "public"."broadcast_messages" to "anon";

grant references on table "public"."broadcast_messages" to "anon";

grant select on table "public"."broadcast_messages" to "anon";

grant trigger on table "public"."broadcast_messages" to "anon";

grant truncate on table "public"."broadcast_messages" to "anon";

grant update on table "public"."broadcast_messages" to "anon";

grant delete on table "public"."broadcast_messages" to "authenticated";

grant insert on table "public"."broadcast_messages" to "authenticated";

grant references on table "public"."broadcast_messages" to "authenticated";

grant select on table "public"."broadcast_messages" to "authenticated";

grant trigger on table "public"."broadcast_messages" to "authenticated";

grant truncate on table "public"."broadcast_messages" to "authenticated";

grant update on table "public"."broadcast_messages" to "authenticated";

grant delete on table "public"."broadcast_messages" to "service_role";

grant insert on table "public"."broadcast_messages" to "service_role";

grant references on table "public"."broadcast_messages" to "service_role";

grant select on table "public"."broadcast_messages" to "service_role";

grant trigger on table "public"."broadcast_messages" to "service_role";

grant truncate on table "public"."broadcast_messages" to "service_role";

grant update on table "public"."broadcast_messages" to "service_role";

grant delete on table "public"."broadcasts" to "anon";

grant insert on table "public"."broadcasts" to "anon";

grant references on table "public"."broadcasts" to "anon";

grant select on table "public"."broadcasts" to "anon";

grant trigger on table "public"."broadcasts" to "anon";

grant truncate on table "public"."broadcasts" to "anon";

grant update on table "public"."broadcasts" to "anon";

grant delete on table "public"."broadcasts" to "authenticated";

grant insert on table "public"."broadcasts" to "authenticated";

grant references on table "public"."broadcasts" to "authenticated";

grant select on table "public"."broadcasts" to "authenticated";

grant trigger on table "public"."broadcasts" to "authenticated";

grant truncate on table "public"."broadcasts" to "authenticated";

grant update on table "public"."broadcasts" to "authenticated";

grant delete on table "public"."broadcasts" to "service_role";

grant insert on table "public"."broadcasts" to "service_role";

grant references on table "public"."broadcasts" to "service_role";

grant select on table "public"."broadcasts" to "service_role";

grant trigger on table "public"."broadcasts" to "service_role";

grant truncate on table "public"."broadcasts" to "service_role";

grant update on table "public"."broadcasts" to "service_role";

grant delete on table "public"."channel_hidden_memberships" to "anon";

grant insert on table "public"."channel_hidden_memberships" to "anon";

grant references on table "public"."channel_hidden_memberships" to "anon";

grant select on table "public"."channel_hidden_memberships" to "anon";

grant trigger on table "public"."channel_hidden_memberships" to "anon";

grant truncate on table "public"."channel_hidden_memberships" to "anon";

grant update on table "public"."channel_hidden_memberships" to "anon";

grant delete on table "public"."channel_hidden_memberships" to "authenticated";

grant insert on table "public"."channel_hidden_memberships" to "authenticated";

grant references on table "public"."channel_hidden_memberships" to "authenticated";

grant select on table "public"."channel_hidden_memberships" to "authenticated";

grant trigger on table "public"."channel_hidden_memberships" to "authenticated";

grant truncate on table "public"."channel_hidden_memberships" to "authenticated";

grant update on table "public"."channel_hidden_memberships" to "authenticated";

grant delete on table "public"."channel_hidden_memberships" to "service_role";

grant insert on table "public"."channel_hidden_memberships" to "service_role";

grant references on table "public"."channel_hidden_memberships" to "service_role";

grant select on table "public"."channel_hidden_memberships" to "service_role";

grant trigger on table "public"."channel_hidden_memberships" to "service_role";

grant truncate on table "public"."channel_hidden_memberships" to "service_role";

grant update on table "public"."channel_hidden_memberships" to "service_role";

grant delete on table "public"."channel_invites" to "anon";

grant insert on table "public"."channel_invites" to "anon";

grant references on table "public"."channel_invites" to "anon";

grant select on table "public"."channel_invites" to "anon";

grant trigger on table "public"."channel_invites" to "anon";

grant truncate on table "public"."channel_invites" to "anon";

grant update on table "public"."channel_invites" to "anon";

grant delete on table "public"."channel_invites" to "authenticated";

grant insert on table "public"."channel_invites" to "authenticated";

grant references on table "public"."channel_invites" to "authenticated";

grant select on table "public"."channel_invites" to "authenticated";

grant trigger on table "public"."channel_invites" to "authenticated";

grant truncate on table "public"."channel_invites" to "authenticated";

grant update on table "public"."channel_invites" to "authenticated";

grant delete on table "public"."channel_invites" to "service_role";

grant insert on table "public"."channel_invites" to "service_role";

grant references on table "public"."channel_invites" to "service_role";

grant select on table "public"."channel_invites" to "service_role";

grant trigger on table "public"."channel_invites" to "service_role";

grant truncate on table "public"."channel_invites" to "service_role";

grant update on table "public"."channel_invites" to "service_role";

grant delete on table "public"."channel_members" to "anon";

grant insert on table "public"."channel_members" to "anon";

grant references on table "public"."channel_members" to "anon";

grant select on table "public"."channel_members" to "anon";

grant trigger on table "public"."channel_members" to "anon";

grant truncate on table "public"."channel_members" to "anon";

grant update on table "public"."channel_members" to "anon";

grant delete on table "public"."channel_members" to "authenticated";

grant insert on table "public"."channel_members" to "authenticated";

grant references on table "public"."channel_members" to "authenticated";

grant select on table "public"."channel_members" to "authenticated";

grant trigger on table "public"."channel_members" to "authenticated";

grant truncate on table "public"."channel_members" to "authenticated";

grant update on table "public"."channel_members" to "authenticated";

grant delete on table "public"."channel_members" to "service_role";

grant insert on table "public"."channel_members" to "service_role";

grant references on table "public"."channel_members" to "service_role";

grant select on table "public"."channel_members" to "service_role";

grant trigger on table "public"."channel_members" to "service_role";

grant truncate on table "public"."channel_members" to "service_role";

grant update on table "public"."channel_members" to "service_role";

grant delete on table "public"."channels" to "anon";

grant insert on table "public"."channels" to "anon";

grant references on table "public"."channels" to "anon";

grant select on table "public"."channels" to "anon";

grant trigger on table "public"."channels" to "anon";

grant truncate on table "public"."channels" to "anon";

grant update on table "public"."channels" to "anon";

grant delete on table "public"."channels" to "authenticated";

grant insert on table "public"."channels" to "authenticated";

grant references on table "public"."channels" to "authenticated";

grant select on table "public"."channels" to "authenticated";

grant trigger on table "public"."channels" to "authenticated";

grant truncate on table "public"."channels" to "authenticated";

grant update on table "public"."channels" to "authenticated";

grant delete on table "public"."channels" to "service_role";

grant insert on table "public"."channels" to "service_role";

grant references on table "public"."channels" to "service_role";

grant select on table "public"."channels" to "service_role";

grant trigger on table "public"."channels" to "service_role";

grant truncate on table "public"."channels" to "service_role";

grant update on table "public"."channels" to "service_role";

grant delete on table "public"."chat_archives" to "anon";

grant insert on table "public"."chat_archives" to "anon";

grant references on table "public"."chat_archives" to "anon";

grant select on table "public"."chat_archives" to "anon";

grant trigger on table "public"."chat_archives" to "anon";

grant truncate on table "public"."chat_archives" to "anon";

grant update on table "public"."chat_archives" to "anon";

grant delete on table "public"."chat_archives" to "authenticated";

grant insert on table "public"."chat_archives" to "authenticated";

grant references on table "public"."chat_archives" to "authenticated";

grant select on table "public"."chat_archives" to "authenticated";

grant trigger on table "public"."chat_archives" to "authenticated";

grant truncate on table "public"."chat_archives" to "authenticated";

grant update on table "public"."chat_archives" to "authenticated";

grant delete on table "public"."chat_archives" to "service_role";

grant insert on table "public"."chat_archives" to "service_role";

grant references on table "public"."chat_archives" to "service_role";

grant select on table "public"."chat_archives" to "service_role";

grant trigger on table "public"."chat_archives" to "service_role";

grant truncate on table "public"."chat_archives" to "service_role";

grant update on table "public"."chat_archives" to "service_role";

grant delete on table "public"."chat_detail_entries" to "anon";

grant insert on table "public"."chat_detail_entries" to "anon";

grant references on table "public"."chat_detail_entries" to "anon";

grant select on table "public"."chat_detail_entries" to "anon";

grant trigger on table "public"."chat_detail_entries" to "anon";

grant truncate on table "public"."chat_detail_entries" to "anon";

grant update on table "public"."chat_detail_entries" to "anon";

grant delete on table "public"."chat_detail_entries" to "authenticated";

grant insert on table "public"."chat_detail_entries" to "authenticated";

grant references on table "public"."chat_detail_entries" to "authenticated";

grant select on table "public"."chat_detail_entries" to "authenticated";

grant trigger on table "public"."chat_detail_entries" to "authenticated";

grant truncate on table "public"."chat_detail_entries" to "authenticated";

grant update on table "public"."chat_detail_entries" to "authenticated";

grant delete on table "public"."chat_detail_entries" to "service_role";

grant insert on table "public"."chat_detail_entries" to "service_role";

grant references on table "public"."chat_detail_entries" to "service_role";

grant select on table "public"."chat_detail_entries" to "service_role";

grant trigger on table "public"."chat_detail_entries" to "service_role";

grant truncate on table "public"."chat_detail_entries" to "service_role";

grant update on table "public"."chat_detail_entries" to "service_role";

grant delete on table "public"."direct_message_messages" to "anon";

grant insert on table "public"."direct_message_messages" to "anon";

grant references on table "public"."direct_message_messages" to "anon";

grant select on table "public"."direct_message_messages" to "anon";

grant trigger on table "public"."direct_message_messages" to "anon";

grant truncate on table "public"."direct_message_messages" to "anon";

grant update on table "public"."direct_message_messages" to "anon";

grant delete on table "public"."direct_message_messages" to "authenticated";

grant insert on table "public"."direct_message_messages" to "authenticated";

grant references on table "public"."direct_message_messages" to "authenticated";

grant select on table "public"."direct_message_messages" to "authenticated";

grant trigger on table "public"."direct_message_messages" to "authenticated";

grant truncate on table "public"."direct_message_messages" to "authenticated";

grant update on table "public"."direct_message_messages" to "authenticated";

grant delete on table "public"."direct_message_messages" to "service_role";

grant insert on table "public"."direct_message_messages" to "service_role";

grant references on table "public"."direct_message_messages" to "service_role";

grant select on table "public"."direct_message_messages" to "service_role";

grant trigger on table "public"."direct_message_messages" to "service_role";

grant truncate on table "public"."direct_message_messages" to "service_role";

grant update on table "public"."direct_message_messages" to "service_role";

grant delete on table "public"."direct_messages" to "anon";

grant insert on table "public"."direct_messages" to "anon";

grant references on table "public"."direct_messages" to "anon";

grant select on table "public"."direct_messages" to "anon";

grant trigger on table "public"."direct_messages" to "anon";

grant truncate on table "public"."direct_messages" to "anon";

grant update on table "public"."direct_messages" to "anon";

grant delete on table "public"."direct_messages" to "authenticated";

grant insert on table "public"."direct_messages" to "authenticated";

grant references on table "public"."direct_messages" to "authenticated";

grant select on table "public"."direct_messages" to "authenticated";

grant trigger on table "public"."direct_messages" to "authenticated";

grant truncate on table "public"."direct_messages" to "authenticated";

grant update on table "public"."direct_messages" to "authenticated";

grant delete on table "public"."direct_messages" to "service_role";

grant insert on table "public"."direct_messages" to "service_role";

grant references on table "public"."direct_messages" to "service_role";

grant select on table "public"."direct_messages" to "service_role";

grant trigger on table "public"."direct_messages" to "service_role";

grant truncate on table "public"."direct_messages" to "service_role";

grant update on table "public"."direct_messages" to "service_role";

grant delete on table "public"."files" to "anon";

grant insert on table "public"."files" to "anon";

grant references on table "public"."files" to "anon";

grant select on table "public"."files" to "anon";

grant trigger on table "public"."files" to "anon";

grant truncate on table "public"."files" to "anon";

grant update on table "public"."files" to "anon";

grant delete on table "public"."files" to "authenticated";

grant insert on table "public"."files" to "authenticated";

grant references on table "public"."files" to "authenticated";

grant select on table "public"."files" to "authenticated";

grant trigger on table "public"."files" to "authenticated";

grant truncate on table "public"."files" to "authenticated";

grant update on table "public"."files" to "authenticated";

grant delete on table "public"."files" to "service_role";

grant insert on table "public"."files" to "service_role";

grant references on table "public"."files" to "service_role";

grant select on table "public"."files" to "service_role";

grant trigger on table "public"."files" to "service_role";

grant truncate on table "public"."files" to "service_role";

grant update on table "public"."files" to "service_role";

grant delete on table "public"."message_bookmarks" to "anon";

grant insert on table "public"."message_bookmarks" to "anon";

grant references on table "public"."message_bookmarks" to "anon";

grant select on table "public"."message_bookmarks" to "anon";

grant trigger on table "public"."message_bookmarks" to "anon";

grant truncate on table "public"."message_bookmarks" to "anon";

grant update on table "public"."message_bookmarks" to "anon";

grant delete on table "public"."message_bookmarks" to "authenticated";

grant insert on table "public"."message_bookmarks" to "authenticated";

grant references on table "public"."message_bookmarks" to "authenticated";

grant select on table "public"."message_bookmarks" to "authenticated";

grant trigger on table "public"."message_bookmarks" to "authenticated";

grant truncate on table "public"."message_bookmarks" to "authenticated";

grant update on table "public"."message_bookmarks" to "authenticated";

grant delete on table "public"."message_bookmarks" to "service_role";

grant insert on table "public"."message_bookmarks" to "service_role";

grant references on table "public"."message_bookmarks" to "service_role";

grant select on table "public"."message_bookmarks" to "service_role";

grant trigger on table "public"."message_bookmarks" to "service_role";

grant truncate on table "public"."message_bookmarks" to "service_role";

grant update on table "public"."message_bookmarks" to "service_role";

grant delete on table "public"."message_forwards" to "anon";

grant insert on table "public"."message_forwards" to "anon";

grant references on table "public"."message_forwards" to "anon";

grant select on table "public"."message_forwards" to "anon";

grant trigger on table "public"."message_forwards" to "anon";

grant truncate on table "public"."message_forwards" to "anon";

grant update on table "public"."message_forwards" to "anon";

grant delete on table "public"."message_forwards" to "authenticated";

grant insert on table "public"."message_forwards" to "authenticated";

grant references on table "public"."message_forwards" to "authenticated";

grant select on table "public"."message_forwards" to "authenticated";

grant trigger on table "public"."message_forwards" to "authenticated";

grant truncate on table "public"."message_forwards" to "authenticated";

grant update on table "public"."message_forwards" to "authenticated";

grant delete on table "public"."message_forwards" to "service_role";

grant insert on table "public"."message_forwards" to "service_role";

grant references on table "public"."message_forwards" to "service_role";

grant select on table "public"."message_forwards" to "service_role";

grant trigger on table "public"."message_forwards" to "service_role";

grant truncate on table "public"."message_forwards" to "service_role";

grant update on table "public"."message_forwards" to "service_role";

grant delete on table "public"."message_hidden_for_users" to "anon";

grant insert on table "public"."message_hidden_for_users" to "anon";

grant references on table "public"."message_hidden_for_users" to "anon";

grant select on table "public"."message_hidden_for_users" to "anon";

grant trigger on table "public"."message_hidden_for_users" to "anon";

grant truncate on table "public"."message_hidden_for_users" to "anon";

grant update on table "public"."message_hidden_for_users" to "anon";

grant delete on table "public"."message_hidden_for_users" to "authenticated";

grant insert on table "public"."message_hidden_for_users" to "authenticated";

grant references on table "public"."message_hidden_for_users" to "authenticated";

grant select on table "public"."message_hidden_for_users" to "authenticated";

grant trigger on table "public"."message_hidden_for_users" to "authenticated";

grant truncate on table "public"."message_hidden_for_users" to "authenticated";

grant update on table "public"."message_hidden_for_users" to "authenticated";

grant delete on table "public"."message_hidden_for_users" to "service_role";

grant insert on table "public"."message_hidden_for_users" to "service_role";

grant references on table "public"."message_hidden_for_users" to "service_role";

grant select on table "public"."message_hidden_for_users" to "service_role";

grant trigger on table "public"."message_hidden_for_users" to "service_role";

grant truncate on table "public"."message_hidden_for_users" to "service_role";

grant update on table "public"."message_hidden_for_users" to "service_role";

grant delete on table "public"."message_mentions" to "anon";

grant insert on table "public"."message_mentions" to "anon";

grant references on table "public"."message_mentions" to "anon";

grant select on table "public"."message_mentions" to "anon";

grant trigger on table "public"."message_mentions" to "anon";

grant truncate on table "public"."message_mentions" to "anon";

grant update on table "public"."message_mentions" to "anon";

grant delete on table "public"."message_mentions" to "authenticated";

grant insert on table "public"."message_mentions" to "authenticated";

grant references on table "public"."message_mentions" to "authenticated";

grant select on table "public"."message_mentions" to "authenticated";

grant trigger on table "public"."message_mentions" to "authenticated";

grant truncate on table "public"."message_mentions" to "authenticated";

grant update on table "public"."message_mentions" to "authenticated";

grant delete on table "public"."message_mentions" to "service_role";

grant insert on table "public"."message_mentions" to "service_role";

grant references on table "public"."message_mentions" to "service_role";

grant select on table "public"."message_mentions" to "service_role";

grant trigger on table "public"."message_mentions" to "service_role";

grant truncate on table "public"."message_mentions" to "service_role";

grant update on table "public"."message_mentions" to "service_role";

grant delete on table "public"."message_reactions" to "anon";

grant insert on table "public"."message_reactions" to "anon";

grant references on table "public"."message_reactions" to "anon";

grant select on table "public"."message_reactions" to "anon";

grant trigger on table "public"."message_reactions" to "anon";

grant truncate on table "public"."message_reactions" to "anon";

grant update on table "public"."message_reactions" to "anon";

grant delete on table "public"."message_reactions" to "authenticated";

grant insert on table "public"."message_reactions" to "authenticated";

grant references on table "public"."message_reactions" to "authenticated";

grant select on table "public"."message_reactions" to "authenticated";

grant trigger on table "public"."message_reactions" to "authenticated";

grant truncate on table "public"."message_reactions" to "authenticated";

grant update on table "public"."message_reactions" to "authenticated";

grant delete on table "public"."message_reactions" to "service_role";

grant insert on table "public"."message_reactions" to "service_role";

grant references on table "public"."message_reactions" to "service_role";

grant select on table "public"."message_reactions" to "service_role";

grant trigger on table "public"."message_reactions" to "service_role";

grant truncate on table "public"."message_reactions" to "service_role";

grant update on table "public"."message_reactions" to "service_role";

grant delete on table "public"."message_read_receipts" to "anon";

grant insert on table "public"."message_read_receipts" to "anon";

grant references on table "public"."message_read_receipts" to "anon";

grant select on table "public"."message_read_receipts" to "anon";

grant trigger on table "public"."message_read_receipts" to "anon";

grant truncate on table "public"."message_read_receipts" to "anon";

grant update on table "public"."message_read_receipts" to "anon";

grant delete on table "public"."message_read_receipts" to "authenticated";

grant insert on table "public"."message_read_receipts" to "authenticated";

grant references on table "public"."message_read_receipts" to "authenticated";

grant select on table "public"."message_read_receipts" to "authenticated";

grant trigger on table "public"."message_read_receipts" to "authenticated";

grant truncate on table "public"."message_read_receipts" to "authenticated";

grant update on table "public"."message_read_receipts" to "authenticated";

grant delete on table "public"."message_read_receipts" to "service_role";

grant insert on table "public"."message_read_receipts" to "service_role";

grant references on table "public"."message_read_receipts" to "service_role";

grant select on table "public"."message_read_receipts" to "service_role";

grant trigger on table "public"."message_read_receipts" to "service_role";

grant truncate on table "public"."message_read_receipts" to "service_role";

grant update on table "public"."message_read_receipts" to "service_role";

grant delete on table "public"."message_todos" to "anon";

grant insert on table "public"."message_todos" to "anon";

grant references on table "public"."message_todos" to "anon";

grant select on table "public"."message_todos" to "anon";

grant trigger on table "public"."message_todos" to "anon";

grant truncate on table "public"."message_todos" to "anon";

grant update on table "public"."message_todos" to "anon";

grant delete on table "public"."message_todos" to "authenticated";

grant insert on table "public"."message_todos" to "authenticated";

grant references on table "public"."message_todos" to "authenticated";

grant select on table "public"."message_todos" to "authenticated";

grant trigger on table "public"."message_todos" to "authenticated";

grant truncate on table "public"."message_todos" to "authenticated";

grant update on table "public"."message_todos" to "authenticated";

grant delete on table "public"."message_todos" to "service_role";

grant insert on table "public"."message_todos" to "service_role";

grant references on table "public"."message_todos" to "service_role";

grant select on table "public"."message_todos" to "service_role";

grant trigger on table "public"."message_todos" to "service_role";

grant truncate on table "public"."message_todos" to "service_role";

grant update on table "public"."message_todos" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."pinned_messages" to "anon";

grant insert on table "public"."pinned_messages" to "anon";

grant references on table "public"."pinned_messages" to "anon";

grant select on table "public"."pinned_messages" to "anon";

grant trigger on table "public"."pinned_messages" to "anon";

grant truncate on table "public"."pinned_messages" to "anon";

grant update on table "public"."pinned_messages" to "anon";

grant delete on table "public"."pinned_messages" to "authenticated";

grant insert on table "public"."pinned_messages" to "authenticated";

grant references on table "public"."pinned_messages" to "authenticated";

grant select on table "public"."pinned_messages" to "authenticated";

grant trigger on table "public"."pinned_messages" to "authenticated";

grant truncate on table "public"."pinned_messages" to "authenticated";

grant update on table "public"."pinned_messages" to "authenticated";

grant delete on table "public"."pinned_messages" to "service_role";

grant insert on table "public"."pinned_messages" to "service_role";

grant references on table "public"."pinned_messages" to "service_role";

grant select on table "public"."pinned_messages" to "service_role";

grant trigger on table "public"."pinned_messages" to "service_role";

grant truncate on table "public"."pinned_messages" to "service_role";

grant update on table "public"."pinned_messages" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."push_subscriptions" to "anon";

grant insert on table "public"."push_subscriptions" to "anon";

grant references on table "public"."push_subscriptions" to "anon";

grant select on table "public"."push_subscriptions" to "anon";

grant trigger on table "public"."push_subscriptions" to "anon";

grant truncate on table "public"."push_subscriptions" to "anon";

grant update on table "public"."push_subscriptions" to "anon";

grant delete on table "public"."push_subscriptions" to "authenticated";

grant insert on table "public"."push_subscriptions" to "authenticated";

grant references on table "public"."push_subscriptions" to "authenticated";

grant select on table "public"."push_subscriptions" to "authenticated";

grant trigger on table "public"."push_subscriptions" to "authenticated";

grant truncate on table "public"."push_subscriptions" to "authenticated";

grant update on table "public"."push_subscriptions" to "authenticated";

grant delete on table "public"."push_subscriptions" to "service_role";

grant insert on table "public"."push_subscriptions" to "service_role";

grant references on table "public"."push_subscriptions" to "service_role";

grant select on table "public"."push_subscriptions" to "service_role";

grant trigger on table "public"."push_subscriptions" to "service_role";

grant truncate on table "public"."push_subscriptions" to "service_role";

grant update on table "public"."push_subscriptions" to "service_role";

grant delete on table "public"."signup_trigger_errors" to "anon";

grant insert on table "public"."signup_trigger_errors" to "anon";

grant references on table "public"."signup_trigger_errors" to "anon";

grant select on table "public"."signup_trigger_errors" to "anon";

grant trigger on table "public"."signup_trigger_errors" to "anon";

grant truncate on table "public"."signup_trigger_errors" to "anon";

grant update on table "public"."signup_trigger_errors" to "anon";

grant delete on table "public"."signup_trigger_errors" to "authenticated";

grant insert on table "public"."signup_trigger_errors" to "authenticated";

grant references on table "public"."signup_trigger_errors" to "authenticated";

grant select on table "public"."signup_trigger_errors" to "authenticated";

grant trigger on table "public"."signup_trigger_errors" to "authenticated";

grant truncate on table "public"."signup_trigger_errors" to "authenticated";

grant update on table "public"."signup_trigger_errors" to "authenticated";

grant delete on table "public"."signup_trigger_errors" to "service_role";

grant insert on table "public"."signup_trigger_errors" to "service_role";

grant references on table "public"."signup_trigger_errors" to "service_role";

grant select on table "public"."signup_trigger_errors" to "service_role";

grant trigger on table "public"."signup_trigger_errors" to "service_role";

grant truncate on table "public"."signup_trigger_errors" to "service_role";

grant update on table "public"."signup_trigger_errors" to "service_role";

grant delete on table "public"."typing_indicators" to "anon";

grant insert on table "public"."typing_indicators" to "anon";

grant references on table "public"."typing_indicators" to "anon";

grant select on table "public"."typing_indicators" to "anon";

grant trigger on table "public"."typing_indicators" to "anon";

grant truncate on table "public"."typing_indicators" to "anon";

grant update on table "public"."typing_indicators" to "anon";

grant delete on table "public"."typing_indicators" to "authenticated";

grant insert on table "public"."typing_indicators" to "authenticated";

grant references on table "public"."typing_indicators" to "authenticated";

grant select on table "public"."typing_indicators" to "authenticated";

grant trigger on table "public"."typing_indicators" to "authenticated";

grant truncate on table "public"."typing_indicators" to "authenticated";

grant update on table "public"."typing_indicators" to "authenticated";

grant delete on table "public"."typing_indicators" to "service_role";

grant insert on table "public"."typing_indicators" to "service_role";

grant references on table "public"."typing_indicators" to "service_role";

grant select on table "public"."typing_indicators" to "service_role";

grant trigger on table "public"."typing_indicators" to "service_role";

grant truncate on table "public"."typing_indicators" to "service_role";

grant update on table "public"."typing_indicators" to "service_role";

grant delete on table "public"."workspace_invites" to "anon";

grant insert on table "public"."workspace_invites" to "anon";

grant references on table "public"."workspace_invites" to "anon";

grant select on table "public"."workspace_invites" to "anon";

grant trigger on table "public"."workspace_invites" to "anon";

grant truncate on table "public"."workspace_invites" to "anon";

grant update on table "public"."workspace_invites" to "anon";

grant delete on table "public"."workspace_invites" to "authenticated";

grant insert on table "public"."workspace_invites" to "authenticated";

grant references on table "public"."workspace_invites" to "authenticated";

grant select on table "public"."workspace_invites" to "authenticated";

grant trigger on table "public"."workspace_invites" to "authenticated";

grant truncate on table "public"."workspace_invites" to "authenticated";

grant update on table "public"."workspace_invites" to "authenticated";

grant delete on table "public"."workspace_invites" to "service_role";

grant insert on table "public"."workspace_invites" to "service_role";

grant references on table "public"."workspace_invites" to "service_role";

grant select on table "public"."workspace_invites" to "service_role";

grant trigger on table "public"."workspace_invites" to "service_role";

grant truncate on table "public"."workspace_invites" to "service_role";

grant update on table "public"."workspace_invites" to "service_role";

grant delete on table "public"."workspace_members" to "anon";

grant insert on table "public"."workspace_members" to "anon";

grant references on table "public"."workspace_members" to "anon";

grant select on table "public"."workspace_members" to "anon";

grant trigger on table "public"."workspace_members" to "anon";

grant truncate on table "public"."workspace_members" to "anon";

grant update on table "public"."workspace_members" to "anon";

grant delete on table "public"."workspace_members" to "authenticated";

grant insert on table "public"."workspace_members" to "authenticated";

grant references on table "public"."workspace_members" to "authenticated";

grant select on table "public"."workspace_members" to "authenticated";

grant trigger on table "public"."workspace_members" to "authenticated";

grant truncate on table "public"."workspace_members" to "authenticated";

grant update on table "public"."workspace_members" to "authenticated";

grant delete on table "public"."workspace_members" to "service_role";

grant insert on table "public"."workspace_members" to "service_role";

grant references on table "public"."workspace_members" to "service_role";

grant select on table "public"."workspace_members" to "service_role";

grant trigger on table "public"."workspace_members" to "service_role";

grant truncate on table "public"."workspace_members" to "service_role";

grant update on table "public"."workspace_members" to "service_role";

grant delete on table "public"."workspaces" to "anon";

grant insert on table "public"."workspaces" to "anon";

grant references on table "public"."workspaces" to "anon";

grant select on table "public"."workspaces" to "anon";

grant trigger on table "public"."workspaces" to "anon";

grant truncate on table "public"."workspaces" to "anon";

grant update on table "public"."workspaces" to "anon";

grant delete on table "public"."workspaces" to "authenticated";

grant insert on table "public"."workspaces" to "authenticated";

grant references on table "public"."workspaces" to "authenticated";

grant select on table "public"."workspaces" to "authenticated";

grant trigger on table "public"."workspaces" to "authenticated";

grant truncate on table "public"."workspaces" to "authenticated";

grant update on table "public"."workspaces" to "authenticated";

grant delete on table "public"."workspaces" to "service_role";

grant insert on table "public"."workspaces" to "service_role";

grant references on table "public"."workspaces" to "service_role";

grant select on table "public"."workspaces" to "service_role";

grant trigger on table "public"."workspaces" to "service_role";

grant truncate on table "public"."workspaces" to "service_role";

grant update on table "public"."workspaces" to "service_role";

-- CREATE TRIGGER send_on_push_dms AFTER INSERT ON public.direct_message_messages FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://wimtadsiujdbbiqazusw.supabase.co/functions/v1/send-push', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpbXRhZHNpdWpkYmJpcWF6dXN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY2OTM2NCwiZXhwIjoyMDkzMjQ1MzY0fQ.Dg5p2yNZjs_Nv76CnepnCarfgvFJV0dBOmW-3crp7JU"}', '{}', '5000');

-- CREATE TRIGGER send_push_on_message_reactions AFTER INSERT ON public.message_reactions FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://wimtadsiujdbbiqazusw.supabase.co/functions/v1/send-push', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpbXRhZHNpdWpkYmJpcWF6dXN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY2OTM2NCwiZXhwIjoyMDkzMjQ1MzY0fQ.Dg5p2yNZjs_Nv76CnepnCarfgvFJV0dBOmW-3crp7JU"}', '{}', '5000');

-- CREATE TRIGGER send_push_on_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://wimtadsiujdbbiqazusw.supabase.co/functions/v1/send-push', 'POST', '{"Content-type":"application/json"}', '{}', '5000');

-- CREATE TRIGGER send_push_on_pinned_message AFTER INSERT ON public.pinned_messages FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://wimtadsiujdbbiqazusw.supabase.co/functions/v1/send-push', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpbXRhZHNpdWpkYmJpcWF6dXN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzY2OTM2NCwiZXhwIjoyMDkzMjQ1MzY0fQ.Dg5p2yNZjs_Nv76CnepnCarfgvFJV0dBOmW-3crp7JU"}', '{}', '5000');


