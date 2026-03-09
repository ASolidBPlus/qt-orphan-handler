QT Orphan Handler


# Explanation #
Basic Torrent Handler for qBitTorrent that checks to find torrents that are 'orphaned'. orphaned meaning, those not linked in other locations.

Use case is for Sonarr/Radarr - sometimes files will be updated/deleted, and because they're hard-linked it'll never be known from the qBitTorrent client. the idea would be you will be able to systematically see these 'orphaned' torrents.

a way to look this up would be to simply check hard link inodes. if there's none, it's orphaned. you would also want to check inodes and determine if the location is in filtered folders, say for cross-seeding. that would mean even with the hard-link, it's still technically orphaned.

it'd interact with qbittorrent similarly to how sonarr etc do. you can directly communicate with mine using: https://qbittorrent.dinfra.cloud for testing.

# Architecture #
this should be light-weight. basic web app fine, maybe something like svelte.

This needs to be dockerisable. Make it auto build the docker in a git action. docker should be lightweight, alpine or w/e people use.

# Configuration #
Strong configuration system that will tell you what labels to look at for orphans. you would want to also have locations to mark as 'cross-seed' or other filters. ability to set specific filters, and what to do with them, would be ideal.

# Web UI #
Should just be basic, show the files orphan'd disk space, etc. ability to delete all.
