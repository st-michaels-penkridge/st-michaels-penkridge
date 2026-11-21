-- Past events on Bygone days. The office can tick "Keep it in Bygone days" on a
-- notice. Once its last day has passed it comes off the Notices page and shows
-- under Past events on the Bygone days page instead. A kept notice needs a last
-- day, so it knows when to move.

alter table public.notices add column keep boolean not null default false;
alter table public.notices add constraint notices_keep_needs_last_day check (not keep or show_until is not null);

drop policy "Public sees current notices" on public.notices;
create policy "Public sees current and kept notices" on public.notices
  for select to anon, authenticated
  using (
    (published and show_from <= current_date and (show_until is null or show_until >= current_date))
    or (published and keep and show_until < current_date)
    or public.is_admin()
  );
