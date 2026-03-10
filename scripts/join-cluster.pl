#!/usr/bin/perl
use strict;
use warnings;

my $node = $ARGV[0] || "172.16.253.240";
my $password = $ARGV[1] || "password";

# Spawn pvecm add command
open(my $fh, "-|", "pvecm add $node") or die "Cannot spawn pvecm: $!";

my $line;
while ($line = <$fh>) {
    print $line;
    if ($line =~ /Are you sure you want to continue connecting/) {
        print $fh "yes\n";
    }
    if ($line =~ /password/) {
        print $fh "$password\n";
    }
}

close($fh);
