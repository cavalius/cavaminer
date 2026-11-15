<img src="logo.svg" alt="CavaMiner" width="300">

CavaMiner is a cryptocurrency miner for **PearlHash** (Pearl, PRL) on
NVIDIA GPUs and **RandomX** (Monero, XMR) on CPUs. One process can mine
both.

- **Fast.** Hand-written CUDA kernels for the RTX 30, 40 and 50 series,
  within a few percent of the fastest closed-source miner; tuning runs
  that measure your hardware for the goal you set (kernels, clocks, power
  limits, undervolting with self-checks) and keep the result.
- **Mines when power is cheap.** Follows the electricity price from 38
  sources in about 40 countries (Danish grid tariffs included), runs the
  cheapest hours of the day, switches profiles on a cron schedule, and
  pauses while other programs use a GPU.
- **Yours to watch and control.** A terminal menu, a web interface with
  your own dashboards and statistics, two-factor logins, a REST API,
  Prometheus metrics and a Home Assistant integration. Every setting can be
  changed from every one of them and from the command line.
- **Dev fee:** 1 % of the PearlHash and of the RandomX mining time pays
  for further development (details below).

Status: beta. Linux and Windows on x86-64, with NVIDIA GPUs of the RTX 30,
40 and 50 series (sm_86, sm_89, sm_120) and any x86-64 CPU; tested on the
pools listed below. Downloads and this documentation:
https://cavaminer.cavalius.net (benchmarks:
https://cavaminer.cavalius.net/benchmarks.html) — bug reports and requests:
https://github.com/cavalius/cavaminer/issues

## Requirements and installation

| | |
|---|---|
| Linux | x86-64 with glibc 2.17 or newer (any distribution of the last ten years); everything below works |
| Windows | Windows 10 or 11, x64, one `cavaminer.exe`; PearlHash and RandomX mine as on Linux (see Windows below for what differs: the program is not code-signed yet, so Windows 11's Smart App Control blocks it; large pages need a right of the account, there is no MSR tweak, no CPU clock cap and no CPU power reading) |
| PearlHash | An NVIDIA GPU of the RTX 30, 40 or 50 series and an NVIDIA driver 525 or newer (RTX 50 series: 575 or newer; 580 or newer runs the kernels built with CUDA 13, which are 1.7 % faster on the RTX 50 series). The CUDA toolkit is not needed: the kernels are inside the miner |
| RandomX | Any x86-64 CPU; AES and AVX2 help. 2 MiB huge pages, about 2.5 GB of memory |
| Root / administrator | Needed for everything that touches the hardware: power limits, clocks, the clock offset, huge pages, the MSR tweak and the CPU clock cap. Mining itself, the menu, the web interface and the statistics work without it |

Every release offers:

| file | |
|---|---|
| `cavaminer-<version>-linux-x86_64.tar.gz` | Linux, the full package: the miner, this README, the license and the third-party notices, and the Home Assistant integration |
| `cavaminer-<version>-linux-x86_64` | Linux, the bare binary; make it executable (`chmod +x`) |
| `cavaminer-<version>.tar.gz` | the HiveOS custom miner (see HiveOS below) |
| `cavaminer-<version>-windows-x86_64.zip` | Windows, the full package (`cavaminer.exe` and the same files) |
| `cavaminer-<version>-windows-x86_64.exe` | Windows, the bare program |

`SHA256SUMS` lists the checksums: `sha256sum -c SHA256SUMS` (Linux) or
`Get-FileHash` (PowerShell) checks a download. The full package unpacks
anywhere:

```sh
tar xzf cavaminer-*-linux-x86_64.tar.gz
cd cavaminer-*-linux-x86_64
```

On Windows, unpack the zip and open a terminal (Windows Terminal or
PowerShell) in that folder; the examples below read `.\cavaminer.exe`
for `./cavaminer`, and `sudo` means a terminal run as administrator.

The miner keeps everything it writes next to its settings file
(`cavaminer.toml` in the directory it is started from, or wherever
`--config` points): the settings, statistics, users, tuning results and
so on. Start it from a directory of its own.

## Quick start

```sh
./cavaminer devices                                   # the GPUs it sees, numbered as nvidia-smi does
sudo ./cavaminer                                      # first start: asks for pools and wallets, then mines
sudo ./cavaminer -o de.pearl.herominers.com:1200 -u <wallet>.<worker>              # PearlHash on all GPUs
sudo ./cavaminer --rx-url pool.supportxmr.com:3333 --rx-user <wallet>              # RandomX on the CPU
sudo ./cavaminer -o <host:port> -u <wallet> --rx-url <host:port> --rx-user <wallet>   # both
```

PearlHash mining runs when a PearlHash pool is set (and GPUs are not
`none`), RandomX mining when a RandomX pool is set. Started in a terminal,
the miner shows its menu (Tab opens it, `?` shows the help, `q` quits);
otherwise it writes log lines. The web interface is at
http://127.0.0.1:4078/ on the same machine (Settings → Web interface opens
it to the network). Ctrl-C, `q` in the menu or `cavaminer ctl stop` end it
(`cavaminer stop` ends a `--daemon`); clocks and power limits go back to
what they were.

## Running the miner

### First start

Started in a terminal without a settings file and without mining options
(`./cavaminer` or `sudo ./cavaminer`), the miner asks what to mine:

- PearlHash on the NVIDIA GPUs: a pool from a list of tested pools
  (HeroMiners, Kryptex, 2Miners, Suprnova, AlphaPool) or any address, TLS
  where the pool offers it, the Pearl wallet, a worker name, backup pools.
- RandomX on the CPU: your own p2pool node or a public pool (SupportXMR,
  HashVault, Nanopool, MoneroOcean, Kryptex, HeroMiners, C3Pool, or any
  address), the Monero wallet, a worker name, backup pools.

It shows the result, writes `cavaminer.toml` and starts mining; the menu,
the web interface and the command line change the settings later. Esc or
Ctrl-C at a question cancels without writing anything. Options that only
choose where the settings are or how the output looks (`--config`,
`--plain`, `--no-tui`, `--log`, `--log-file`, `--pid-file`) do not stop the
questions; any mining option does.

### Settings, options and the settings file

Everything the miner does is a setting with one name in all interfaces,
for example `electricity.max_price` or `randomx.threads` (the complete
list is in the reference at the end). Settings live in `cavaminer.toml`
and are changed by the menu, the web interface, the API, Home Assistant
and `cavaminer config set`; a running miner reads a changed file within
seconds, and settings marked "restart" apply after a restart (menu →
Restart, or `cavaminer ctl restart`).

Options on the command line override the file for that run: `-o` and
`--rx-url` replace the pool lists, `--set key=value` sets any setting (over
the file and the profile in effect; the value stays out of the file when
settings are saved during the run), and a `--power-max` given on the
command line is a hard ceiling the menu cannot raise. Options set on the
command line are marked "cmd line" in the menu and the web interface
(`--set` values are not).

### Output modes

| | |
|---|---|
| menu | In a terminal (also inside tmux or screen) the miner shows its interactive menu; see The menu below |
| log lines | Without a terminal (a service, HiveOS, a pipe) or with `--no-tui`: status lines every 30 s (`--status-interval`, at least 5) and the log, with colours only when the output is a terminal and `NO_COLOR` is not set |
| `--plain` | Plain text everywhere: log lines without colours or other control codes, no menu, simple line prompts at the first start |
| `--quiet` (`--silent`) | No output at all, in the foreground (only a fatal error at the start still goes to stderr); the log can still go to `--log-file` |
| `--daemon` | In the background; see below |

`--log` sets the log level (`info`, `debug`, `warn`, or filters such as
`cavaminer=debug`); `--log-file` also writes the log to a file (always
without colours).

### Background mode

`--daemon` (`-B`, `--background`) runs the miner in the background: it
detaches from the terminal, prints its process id and returns. The log
goes to `--log-file` (default `cavaminer.log` next to the settings file)
and the process id to `--pid-file` (default `cavaminer.pid`). The pools
must be set already (the first-start questions need a terminal).

```sh
sudo ./cavaminer --daemon      # CavaMiner runs in the background (pid 12345); log: cavaminer.log …
sudo ./cavaminer stop          # SIGTERM; waits until the GPUs are restored and the miner has exited
sudo kill -HUP 12345           # restart with the saved settings
```

A second miner with the same pid file is refused.

### As a systemd service

Under systemd, run the miner in the foreground with `--no-tui` (its log
lines go to the journal, and systemd restarts it) from a directory of its
own, so that its files stay together:

```ini
[Unit]
Description=CavaMiner
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/var/lib/cavaminer
ExecStart=/opt/cavaminer/cavaminer --no-tui
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Set up the pools first (`cavaminer config set pools.pearl '[…]'` in that
directory, or run the miner there once in a terminal), or give them on the
command line. `cavaminer ctl status` and the web interface work as usual.

### HiveOS

The HiveOS package (`cavaminer-<version>.tar.gz`) is a custom miner:
in the flight sheet choose "Custom" as the miner, give the package's
download URL as the installation URL, and fill in:

| flight sheet field | becomes |
|---|---|
| Pool URL | `-o <url>` (several, comma-separated, for failover) |
| Wallet and worker template | `-u <template>`, e.g. `%WAL%.%WORKER_NAME%` (the worker name is the rig's name) |
| Pass | `-p <password>` (optional) |
| Extra config arguments | any further options, separated by `;`, e.g. `--rx-url xmr.pool.example:3333;--rx-user <wallet>` (not `--api` or `-p`: the package sets those) |

The miner then runs with log output and reports its hashrate (as kH/s of
the pool's unit), temperatures, fans and shares to the HiveOS agent through
`http://127.0.0.1:4078/summary`. Leave the clocks and power limits to
HiveOS' overclocking profiles there: the miner's own clock locks would be
reset when it exits. The package has not yet been tested on a HiveOS rig;
reports are welcome.

### Windows

`cavaminer.exe` is the same miner: the menu in Windows Terminal or
PowerShell, the web interface, the API, every setting and command. Run it
in a terminal opened as administrator for power limits, clocks, the clock
offset and large pages; without that it mines with the driver's settings.
What differs from Linux:

- **Not code-signed yet.** The Windows program carries no code signature
  in this release; a signed one will follow in a future release. Until
  then:
  - With **Smart App Control** on (Windows 11; Windows Security → App &
    browser control → Smart App Control), Windows refuses to start it:
    "An Application Control policy has blocked this file". There is no
    exception for a single program: either turn Smart App Control off
    (on many Windows 11 versions it cannot be turned on again without
    resetting Windows), or wait for the signed release.
  - Otherwise SmartScreen may warn when the downloaded program is first
    started ("Windows protected your PC": More info → Run anyway). To
    avoid it, unblock the zip before unpacking it (Properties → Unblock,
    or `Unblock-File` in PowerShell). Check the download against
    `SHA256SUMS` (`Get-FileHash` in PowerShell) either way.
- Background mode: `--daemon`, `cavaminer stop` and SIGHUP are Unix.
  To keep the miner running, make a scheduled task that starts it at
  boot as your account, elevated and without a stored password (in an
  administrator PowerShell; the task runs `cavaminer.exe --no-tui` in the
  miner's folder, and `cavaminer ctl stop` / `ctl restart` control it):

```powershell
$a = New-ScheduledTaskAction -Execute 'C:\cavaminer\cavaminer.exe' -Argument '--no-tui --log-file cavaminer.log' -WorkingDirectory 'C:\cavaminer'
$p = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Highest
$s = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Days 3650) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName cavaminer -Action $a -Principal $p -Settings $s -Trigger (New-ScheduledTaskTrigger -AtStartup)
Start-ScheduledTask -TaskName cavaminer
```

- RandomX large pages (the 2 MiB pages of Linux) need the right "Lock
  pages in memory" for your account: `cavaminer hugepages --persist` as
  administrator grants it (Local Security Policy → User Rights
  Assignment), and it applies after logging in again. `cavaminer
  hugepages` shows whether the account has it. 1 GiB pages are Linux only.
- Not available on Windows: the MSR tweak (it needs a kernel driver), the
  maximum CPU clock and the CPU's tuning run (cpufreq), the CPU's package
  power (RAPL); Linux hashrates with the MSR tweak are 4–12 % higher.
- Auto-pause matches programs by their program name (not the command
  line); `cavaminer gpu-procs` shows the names as the miner sees them.
- An electricity price `command` runs through `cmd /C`.
- The HiveOS package is Linux only. Everything else, including the files
  next to the settings file and the Home Assistant integration, is the
  same.

## Pools

### Pool lists and failover

Each algorithm has an ordered list of pools, each with its own login. The
first enabled pool is used; after two failed connections in a row the
miner moves to the next one, and while it is on a backup pool it tries the
first one again every 5 minutes (every 30 minutes when that pool had
rejected it) and goes back as soon as it answers. In the settings file
(or the menu: Mining → PearlHash pools / RandomX pools, or the web
interface: Pools):

```toml
[[pools]]                        # PearlHash
url = "de.pearl.herominers.com:1200"
user = "<wallet>.<worker>"
[[pools]]
url = "backup.example:1200"
user = "<wallet>.<worker>"
enabled = false                  # kept in the list, not used

[[randomx.pools]]                # RandomX
url = "p2pool.lan:3333"
user = "rig1+450000"
```

`-o` / `--rx-url` on the command line replace the lists; `-u`, `-p`, `-w`
(`--rx-user`, `--rx-pass`) fill in the login of pools that have none.
Settings files with the older `[pool] url = [...]` form are converted when
loaded. A profile can have pool lists of its own.

### TLS

`stratum+ssl://host:port` (or `stratum+tls://`, `ssl://`, `tls://`)
connects with TLS. The certificate is checked against the built-in
Mozilla root store and the log says whether it verified, with its SHA-256
fingerprint. As in other miners, a certificate that does not verify
(self-signed, or issued for another host name) still gives an encrypted
connection; to accept only one certificate, pin it:

```toml
[[randomx.pools]]
url = "stratum+ssl://pool.supportxmr.com:443"
user = "<wallet>"
fingerprint = "58c7896fcaef14dbc0aa8a92fe5b297dabd9fa5912d21647ec854a499b3d6486"
```

### PearlHash pools

Tested on 2026-09-30 (shares accepted unless noted):

| pool | address (TLS) | login |
|---|---|---|
| HeroMiners | `de.pearl.herominers.com:1200` (TLS on the same port; certificate for `pearl.herominers.com`) | `wallet.worker` |
| Kryptex | `prl-eu.kryptex.network:7048` (TLS `:8048`; also `prl-us`, `-sg`, …) | `wallet/worker` |
| 2Miners | `prl.2miners.com:1818` (TLS `:11818`) | `wallet.worker` |
| Suprnova | `prl.suprnova.cc:3373` (TLS `:3374`) | `wallet.worker` |
| AlphaPool | `eu1.alphapool.tech:5571` (plain TCP; also `us1`, `us2`, `ru1`, `sg1`; `:5566` is their own miner's protocol) | `wallet.worker`; `wallet+nacr1….worker` merge-mines NACRE |
| K1Pool | `eu.pearl.k1pool.com:3360` | K1Pool account `Kr_….worker` |

The login is `wallet.worker` (or `wallet/worker`); `-w` / a pool's
`worker` field overrides the worker part. Shares are sent compressed
(`plain_proof_zst`, about 3 KB); 2Miners, Suprnova, K1Pool and Kryptex take
only uncompressed proofs (about 136 KB), so the miner switches to
`plain` for such a pool after its first rejection, or when a compressed
share gets no answer for 15 s (Kryptex ignores them), and sends the waiting
shares again. `pool.proof = "plain"` (`--proof plain`) makes that the
default.

A pool password other than the default `x` (`password` in a pool entry,
`-p`) goes to the pool with the login. AlphaPool reads options there:
`x;d=N` pins the share difficulty (their table: 131072 for an RTX 3070,
262144 for a 3090, 1048576 for a 5090; several GPUs on one rig share one
connection, so add them up; far lower values such as 4096 are refused at
login) and `;t=N` the payout threshold in PRL (for the whole wallet).
Without `d=` their vardiff starts at about a twentieth of a 5090's
difficulty and takes minutes to settle. Merge mining NACRE needs nothing
from the miner but the `+nacr1…` address after the wallet. Tested again on
2026-10-22 (static difficulty and merge mining, Linux and Windows):

```toml
[[pools]]
url = "eu1.alphapool.tech:5571"
user = "<wallet>+<nacr address>.<worker>"
password = "x;d=1048576"
```

Not supported: PearlFortune (its own protocol with client certificates),
pearlhash.xyz (closes the connection on any stratum message), PullSignal
(logs in but sent no jobs in our tests).

### RandomX pools

RandomX works with the xmrig/p2pool dialect (`login`/`job`/`submit`,
`keepalived`) that Monero pools use: p2pool (plain `host:3333`, also the
mini and nano sidechains), SupportXMR (`pool.supportxmr.com:3333`, TLS
`:443`), HashVault, Nanopool, MoneroOcean, Kryptex, HeroMiners, C3Pool and
the others speaking the same protocol. The login is the wallet address
(for p2pool any name; `name+N` fixes the share difficulty at N) and the
password usually the worker name. The login asks for `rx/0` and `rx/2`
only, so algorithm-switching pools such as MoneroOcean send RandomX jobs.

### RandomX v2

Monero's next hard fork (FCMP++) changes its proof of work to RandomX v2
(`rx/2`): longer programs, AES in the main loop, and shares judged by a
commitment (a Blake2b hash of the block blob and its RandomX hash). The
date is not set yet. CavaMiner mines both versions and follows each job's
`algo`: when your pool switches to `rx/2` at the fork, the miner switches
with it, without an update and without rebuilding the dataset (both
versions use the same one); the log says "the pool asks for RandomX v2",
and the menu and the web dashboard show "RandomX v2". Shares are submitted
the way xmrig 6.26 does. Your pool must support the fork as well and
name `rx/2` in its jobs (as xmrig expects too: a job without `algo` is
mined as `rx/0`); if you run your own P2Pool, it needs P2Pool v5 by then,
and P2Pool v5 pays main addresses only (no subaddresses). `cavaminer rx-bench --v2`
measures your CPU on v2 now (compare with xmrig 6.26 or newer, `-a rx/2`).

## GPUs (PearlHash)

### GPU numbers and saved settings

A GPU's number (GPU0, GPU1, …) is its place on the PCI bus, the order of
`nvidia-smi` and of `cavaminer devices`, and the same everywhere: `-d`,
the menu, the web interface, the API, the logs, `/summary` and Prometheus.
A card added in a slot before the others shifts the numbers, but the
saved settings belong to the cards: each GPU's power limit, clocks and
offset are saved with its UUID (which stays with the card) and its slot
(PCI address), and checked at every start:

- the same card in the same slot keeps its settings;
- a card moved to another slot takes them along (`miner.follow_gpus`,
  default on; off, the settings stay with the slot);
- a new card of the same model in a slot gets that slot's settings;
- a card of another model never gets the settings of the card that was in
  its slot before;
- settings of cards no longer in the machine stay in the file, for when
  they come back.

What changed is logged and saved (also in the profiles); `cavaminer
devices` shows each GPU's number, PCI address and UUID, the settings it
gets and what the next start would change.

### Power limit, ceiling and clocks

Each GPU has (per profile):

| setting | |
|---|---|
| power limit | set before mining starts (`--power-limit`); on exit the lower of the original and the requested limit stays, so it is never raised behind your back |
| ceiling (`power_max`) | a hard limit nothing (tuning, the menu) ever goes above; default the power limit given, else the limit the GPU had at start |
| memory clock | locked while mining (`--mem-clock`); PearlHash needs little memory bandwidth, so a low memory clock gives the cores more of the power budget (see Tuning) |
| GPU clock | locked while mining (`--gpu-clock`); power and thermal limits still apply |
| clock offset | the voltage/frequency curve's offset (`--gpu-offset`, undervolting; see Tuning) |
| clock cap (`gpu_clock_max`) | the highest GPU clock; unlike a lock the clock can still drop. Saved with an offset, so a light load cannot boost the GPU to clocks the offset was never tested at |
| fan speed (`fan_speed`) | a fixed speed in percent instead of the driver's fan control (`--fan-speed`); see below |
| temperature limit (`temp_limit`) | the temperature the miner keeps the GPU at or below (`--temp-limit`); see below |
| kernel, `k`, `m` | which kernel the GPU mines with and its matrix shape (`--kernel`); see Kernels |

On the command line each takes one value for all GPUs or a comma-separated
list, one per GPU in `-d` order; the menu (Mining → GPUs), the web
interface (Settings) and the API apply them at once. The menu and the web
interface offer the clocks the driver supports, the power range it allows
and the kernels the GPU can run. All of them need root (but the kernel)
and are reset when the miner exits (the power limit ends at the lower of
its original and requested value).

### Fans and temperature

`--fan-speed 70` (`fan_speed`) fixes the fans at a speed instead of the
driver's fan control. A cooler GPU leaks less current: at the same clock
it draws a few watts less, and under a power limit it clocks a little
higher. Whoever fixes the fans has to watch the temperature; the miner
gives them back to the driver 6 °C before the GPU's slowdown temperature,
while mining is paused, and when it exits.

`--temp-limit 70` (`temp_limit`) keeps the GPU at or below a temperature:
above it the GPU clock gets a ceiling just under the clock it runs at,
which drops by about 1 % (up to 3 % when the GPU is several degrees over)
every 15 seconds while the GPU stays too hot (never below half the highest
clock), and rises again by 1 % every 15 seconds once the GPU is 3 °C under
the limit, until the clock lock or cap of the settings is back. It works
at every power limit and with clock locks and offsets. Tuning runs switch
it off while they measure (they watch the temperature themselves and never
choose a setting hotter than the limit).

### Kernels

The kernel is the GPU program that does the mining. The miner has several,
and which one is best depends on the GPU and on where it runs:

| kernel | GPUs | |
|---|---|---|
| `mma52` | RTX 50 | builds one operand from its noise inside the kernel: the least power per hash. The default on RTX 50 |
| `mma51` | RTX 50 | the same with other hash tiles; a little more power |
| `mma23` | RTX 50 | both operands from memory: the tensor cores busiest (about 3 % more hashrate at the same clock with `k` and `m` 8192) for about 15 % more power. For a GPU that runs at its clock ceiling, not at its power limit |
| `mma17g` | all | builds one operand from its noise: little memory traffic, so low memory clocks cost nothing. The default on RTX 30 |
| `mma17h` | all | both operands from memory, with cache policies: needs the memory clock. The default on RTX 40 and other GPUs |
| `mma17` | all | both operands from memory |

`kernel = "auto"` (the default) picks by GPU model. `k` (the matrices'
common dimension) and `m` (rows per attempt) are chosen by the kernel for
the GPU's cache size unless set. Each GPU can have its own kernel and
shape: `--kernel mma52,mma23` (one per GPU), `gpu.0.kernel`, the menu and
the web interface (a change starts that GPU again, a few seconds); the
miner-wide `miner.kernel`, `miner.k` and `miner.m` are the default for
GPUs without their own.

The defaults were measured on an RTX 3070, an RTX 3090 and an RTX 5090.
On other GPUs (RTX 40, the smaller RTX 50, workstation cards) let the
miner measure: a **kernel scan** is a tuning run that tries the kernels
and matrix shapes worth measuring on that GPU (the default first; on an
RTX 50: mma52, mma51, mma23 in up to three shapes, mma17g), at the
settings the GPU has, while it keeps mining, and keeps the one with the
most hashrate (or the most hashes per joule) for that GPU:

```sh
sudo ./cavaminer --tune-preset kernels         # at the start, by hashrate (--tune efficiency: by efficiency)
./cavaminer ctl tune --preset kernels [--device N] [efficiency]
```

Also in the menu and the web interface (Tuning, the Kernel scan setup).
Any tuning run can include the kernels (`kernel = search`, or a list of
the kernels to try); see Tuning.

### Hashrate

PearlHash hashrate is reported in the pool's unit, int8
multiply-accumulates per second (TH/s = 10¹² MAC/s); RandomX in hashes per
second. Efficiency is hashes per joule, shown as GH/W (PearlHash) or H/W
(RandomX).

## RandomX on the CPU

### Threads and CPUs

The RandomX dataset needs 2 MiB of cache per hashing thread to run at full
speed, so by default the miner takes the number of threads from the
caches: per L3 cache one thread per 2 MiB of L3, plus one per L2 cache of
2 MiB or more where the L3 does not hold copies of the L2s (recent
Intel), at least one per core where a core's L2 and its share of the L3
hold 2 MiB (Xeon Scalable), and at most one per logical CPU. The threads
are spread over the L3 caches by what they hold, one per core first, then
the SMT siblings, and pinned to their CPUs at the lowest priority (`nice`
19), so the GPU feeding and the rest of the system go first.

Other choices: a number of threads in all (`randomx.threads`), a number on
every socket (`randomx.threads_per_socket`), or the CPUs themselves
(`randomx.affinity`, e.g. `0-15,64-79`; with it, `auto` threads means one
per listed CPU). In the menu (Mining → RandomX settings, Enter on Threads,
Threads per socket or CPUs) and in the web interface (Settings → RandomX,
"Choose CPUs…") a picture of the CPU shows every socket, its L3 caches
(with the threads each holds) and the cores with their logical CPUs: choose
automatic, a number in all or per socket (the picture shows which CPUs the
miner picks), or switch CPUs, cores, L3 caches and sockets on and off
yourself; the CPU list follows. `GET /api/v1/cpu` and `GET /api/v1/cpu/plan`
give the same to scripts.

On machines with several NUMA nodes (servers with two or more sockets)
each node with hashing threads gets its own dataset in its own memory,
and the threads read their node's: twice the memory and huge pages (or
three 1 GiB pages per node), but no reads across sockets.

### Huge pages

The dataset (2080 MiB), the cache (256 MiB) and each thread's scratchpad
(2 MiB) want 2 MiB huge pages: 1040 + 128 + one per thread. Started as
root, the miner reserves the missing ones itself (memory is compacted
first if the kernel finds too few) and leaves them reserved for the next
start, as xmrig does; without root it says which command reserves them.
`cavaminer hugepages` shows what is needed and reserves it (as root);
`sudo cavaminer hugepages --persist` also writes
`/etc/sysctl.d/60-cavaminer-hugepages.conf`, so they are reserved at boot,
before memory fragments. Without reserved huge pages the dataset asks for
transparent huge pages (THP `always` or `madvise`), which recovers part of
the loss. With `randomx.pages_1gb` (`--rx-1gb-pages`) the dataset goes on
three 1 GiB pages (reserved at start as root; at boot: `hugepagesz=1G
hugepages=3` on the kernel command line).

### MSR tweak

As root on AMD Zen 2 to Zen 5 (Zen 4: the Ryzen 7000 desktop and 7040 /
8040 mobile parts; other Zen 4 models are left alone) and on Intel CPUs
the miner sets the few prefetch-related CPU registers that xmrig's "MSR
mod" sets (+11 % on a Zen 2 Threadripper, +4 % on Zen 3 to 5, +8–12 % on
Intel) and restores them on exit. `randomx.msr = false` (`--rx-msr false`) leaves them alone.

### Maximum CPU clock

RandomX loses less hashrate than power at lower clocks, so a clock cap
often pays: a Ryzen 9 9950X keeps 91 % of its hashrate at 4000 MHz with
60 % more hashes per joule, a 7950X 95 % at 4500 MHz (+47 %), a
Threadripper PRO 3995WX 91 % at 2600 MHz (+23 %); a CPU already held back
by a power limit (such as an Intel at 65 W) gains nothing.
`randomx.max_freq` (`--rx-max-freq`; Settings → RandomX → Maximum CPU
clock) sets cpufreq's maximum on every CPU while RandomX mines (Linux, as
root) — all of them, also the ones without a hashing thread: the cores
share their supply voltage, so one uncapped core that boosts for other
work raises the voltage and power of the capped ones (a 3995WX mining on
64 of its 126 threads at 2000 MHz: 286 W with only the mining cores
capped, 187 W with all). With acpi-cpufreq (older Ryzen without
amd-pstate) there are only the P-states, and the boost clocks above them
ignore the limit, so a cap also turns boost off (per core where the
kernel allows, else for all CPUs): a Ryzen 9 5950X then runs at its
3400 MHz base clock, 92 % of the hashrate with 21 % more hashes per
joule. The original limits come back when mining stops, while it is
paused and after a crash. With profiles and a schedule the cap can depend
on the time of day or the electricity price; the setting applies at
once. A tuning run of the CPU measures yours (see Tuning);
`cavaminer --rx-max-freq 4000 rx-bench` tests one value offline.

## Tuning

PearlHash is compute-bound: under a power limit, every watt the memory
does not use goes to the GPU cores. Locking the memory clock low raises
the hashrate at the same power — on an RTX 3090 at 250 W, 5001 MHz instead
of 9501 MHz gives about +20 % — and the GPU clock lock, the power limit,
the clock offset and the kernel each move the balance between hashrate and
watts. The miner measures all of them for you, while it keeps mining, in a
**tuning run**.

### A tuning run

A run tries settings, measures each while the device mines (the hashrate
from the work done, the watts from the energy counter), and lets a goal
choose among what it measured. You say three things:

- **what to try**: on a GPU the kernel, the memory clock, the power limit,
  the GPU clock lock and the clock offset; on the CPU its maximum clock.
  Each of them is kept as it is, searched by the tuner, or given the
  values to try;
- **the goal** that chooses;
- **what happens with the choice**: it is applied and saved, saved as
  profiles, or the run only measures.

```sh
sudo ./cavaminer --tune                                   # at the start: a run with the tuning settings
sudo ./cavaminer --tune efficiency --tune-kernel search   # … with a goal, and the kernels too
./cavaminer ctl tune                                      # in the running miner
./cavaminer ctl tune hashrate --device 0 --kernel search
./cavaminer ctl tune --preset sweep --power 300..450/10   # a power sweep; nothing is changed
./cavaminer ctl tune --preset full --plan                 # what would this run do, and how long?
./cavaminer ctl tune --cancel
```

A run is described by a set of **fields**, and they have the same names
wherever a run is started:

| | |
|---|---|
| settings | `tune.<field>` — `[tune]` in the settings file, `cavaminer config set tune.goal efficiency` |
| at the start | `--tune [GOAL]` starts a run a minute after the start; `--tune-<field> <value>` |
| running miner | `cavaminer ctl tune [GOAL] --<field> <value>` |
| API | `POST /api/v1/tune` with `{"<field>": "<value>", …}` |
| web interface, menu | Tuning: the fields as a form, with what the run would do beside it |
| Home Assistant | the service `cavaminer.tune` with the fields |

A run takes each field from the first of these that gives it: the request
itself (the options of `--tune` and `ctl tune`, the API's body), a
**preset** named in the request, the saved tuning settings, the defaults.
The saved tuning settings are what the Tuning page and the menu show and
edit, so `cavaminer ctl tune` alone starts the run you see there, and any
field can be changed for one run without saving it. (Start on the web page
saves the form first; the menu saves each change as it is made.)

| field | default | |
|---|---|---|
| `device` | `gpus` | what is tuned: `gpus` (every GPU), `cpu` (RandomX), or GPUs by number, UUID or PCI address (`0,1`; `--gpu` also names it) |
| `goal` | `balance:90` | what chooses: see the goals below |
| `kernel` | `keep` | the kernels: `keep`, `search`, or the kernels to try (`mma52,mma23:16384:4096`: kernel, k, m) |
| `memory` | `search` | the memory clocks: `keep`, `search`, `7001..`, or `default,7001,5001` (MHz) |
| `power` | `search` | the power limits: `keep`, `search`, `200..450`, or `300,350`, `200..450/25`, `max`, `min` (W) |
| `clock` | `search` | the GPU clock locks: `keep`, `search`, `1000..`, or `none,1500,1400`, `1200..1800/50` (MHz) |
| `offset` | `keep` | the clock offset (undervolting): `keep`, `none`, `search`, or the search's end and step `..800/25` (MHz) |
| `offset_margin` | `50` | the offset kept stays this far below the highest one without errors (MHz) |
| `cpu_clock` | `search` | on the CPU, its maximum clocks: `search`, `3000..`, `4500,4000`, `3000..5000/250` (MHz), or `keep` |
| `method` | `staged` | `staged`: each setting in turn, as far as the goal needs; `grid`: every combination of the values |
| `window` | `30` | seconds each setting is measured |
| `settle` | `auto` | seconds before each measurement; `auto`: half the window, 8 s at least (10 s on the CPU) |
| `temp_max` | `auto` | settings hotter than this (°C) are measured but never chosen; `auto`: the GPU's temperature limit |
| `apply` | `true` | apply and save what the goal chooses; `false`: only measure, the settings from before return |
| `profiles` | `none` | profiles that get the choice of a goal of their own: `default` (`max` = hashrate, `balanced` = balance, `efficient` = efficiency), `night=power:200,day=hashrate`, or both (`default,night=power:200`; `default,balanced=balance:85` gives one of the three another goal) |

In the settings file the tuning settings are the `[tune]` table (only what
differs from the defaults needs to be there):

```toml
[tune]
goal = "efficiency"
memory = "7001.."       # a GPU that also drives a desktop
window = 45
profiles = "day=hashrate, night=power:300"
```

What a setting's field can say:

| value | |
|---|---|
| `keep` | as it is: nothing is tried, the run measures with what is set |
| `search` | the tuner's own candidates and its search, as far as the goal needs them |
| `a..b` | the same search within bounds; either end may be left out (`7001..`, `..450`) |
| values | exactly these: `300,350,400`, a range with a step (`200..450/25`; `../5` is the whole range in 5 W steps), and the words `default` (the driver's memory clock), `none` (no clock lock, no maximum CPU clock), `max` and `min` (the highest and lowest power limit). A single value is fixed for the run |

A value a GPU does not take (a memory clock it does not list, a power
limit above its ceiling, a kernel of another architecture) is left out
for that GPU — the plan and the log say which — so one list can serve a
rig of different cards; a GPU with no value left is skipped with a
message.

The goals:

| goal | |
|---|---|
| `hashrate` | the most hashrate |
| `efficiency` | the most hashes per joule |
| `balance` | the most efficient setting that keeps 90 % of the highest hashrate (`balance:85` for another share) |
| `power:300` | the most hashrate at or below 300 W drawn |
| `rate:70` | the least power for at least 70 TH/s (on the CPU: kH/s) |
| `knee` | going up in power, the last setting whose extra watts still earn 35 % of its average efficiency (`knee:50` for another share): where more power stops paying |

The presets are the runs most people want, each a set of field values
(`--tune-preset`, `ctl tune --preset`, `"preset"` in the API, the Quick
setups of the web page, `r` in the menu); fields given with a preset
still override it:

| preset | fields | |
|---|---|---|
| `balance` | goal `balance`; memory, power, clock `search` | the best compromise |
| `hashrate` | goal `hashrate`; memory, power, clock `search` | the most hashrate, at the highest power limit allowed |
| `efficiency` | goal `efficiency`; memory, power, clock `search` | the most hashes per joule |
| `clocks` | goal `efficiency`; memory, clock `search`; power `keep` | memory clock and clock lock at the power limit set (the auto-tune of 0.35) |
| `kernels` | goal `hashrate`; kernel `search`; the rest `keep` | a kernel scan at the settings in place |
| `sweep` | power `../5`; the rest `keep`; apply `false` | a power sweep: the curve, nothing is changed |
| `undervolt` | goal `hashrate`; offset `search`; the rest `keep` | the clock offset search at the power limit set |
| `full` | goal `balance`; kernel, memory, power, clock `search`; profiles `default` | everything but undervolting, with the three profiles |
| `cpu` | device `cpu`; cpu_clock `search`; apply `false` | the CPU's maximum clock stepped down: the curve, nothing is changed |

`ctl tune --plan` (the web page and the menu show the same beside the
form; `"plan": true` in the API) says what a run would do on each device
— its steps, the measurements at most and the time at most — and starts
nothing. `ctl tune --status` shows what runs; `ctl tune --cancel` (with
`--device`: only there) stops runs, and the settings from before return.

### How a run goes

A **staged** run takes each setting it tries in turn, in the order that
needs the fewest measurements:

1. where the tuner chooses the power limits itself: the lowest limit the
   GPU holds under load. Some GPUs cannot get down to their lowest limit
   while they compute (an RTX 3090 at 100 W: the driver drops it to its
   idle clock, a seventh of the hashrate for a third of the power); that
   limit is the lower end of everything the run measures;
2. the kernels (`kernel`), each at the power limits the goal cares about:
   the highest for `hashrate`, the lowest for `efficiency`, both for
   `balance`, `rate` and `knee`. Within the noise the miner's own choice
   stays;
3. the memory clock (`memory`): `search` tries the driver's default and
   every clock it lists except the idle one, at the power limit where the
   goal decides — the highest for `hashrate`, `balance`, `rate`, `knee` and
   runs with profiles, the given one for `power`, the lowest for
   `efficiency` — by hashrate where only the hashrate counts, else by
   efficiency (at one power limit: the same hashrate for less power). `7001..` tries no
   clock below 7001 MHz, for a GPU that also drives a desktop, which a low
   memory clock slows down;
4. the clock offset search (`offset = search`; outside the safe range, see
   below). Where the hashrate counts it runs at the highest power limit,
   where the efficiency counts at the lowest (lower clocks take a larger
   offset); `balance`, `rate`, `knee` and a run with profiles need both. After
   each search the kernels of step 2 that came within 3 % of the best are
   measured once more, because a GPU that now sits at its clock cap
   instead of its power limit may prefer another;
5. the curve: the power limits (`power`) from the highest down, then GPU
   clock locks (`clock`) below the clock of the lowest limit. `search`
   measures about seven limits between the ceiling and the lowest the GPU
   holds, and locks 5 % apart until the efficiency has fallen twice in a
   row, both only as far as the goal needs: `hashrate` needs the top
   alone, `balance` stops where the hashrate falls under its share. Limits
   and locks given as values are all measured. Down the curve the next
   lower memory clock gets another try every few points: it starts to pay
   where the cores need less of the memory's speed. With an offset search
   the power limits are measured under the offset found at the top, the
   lowest limit and the clock locks under the one found at the bottom
   (for `efficiency` only these: its choice is at the low end);
6. the goal chooses among the curve; the choice is applied, measured once
   more and saved in the running profile.

A **grid** run (`method = grid`) measures every combination of the values
of every setting tried — kernels × memory clocks × power limits × clock
locks, the offset search first — and the goal chooses among all of them.
It makes no assumptions about your hardware and takes the longest: the
plan says how many measurements that is.

A run saves what it was asked to try, and what it had to change on the way
(an offset it lowered, a clock lock it lifted): a kernel scan saves the
kernel, a run with `power = keep` leaves the power limit setting alone.
A clock lock in place is lifted for the run when the power limit or the
clock offset is tried (the limit could not move the clock under it).
`apply = false` changes nothing on the device and puts the settings from
before back (profiles named in `profiles` are still saved): the
run is a sweep, its results are kept (its goal only marks a choice among
them; a run that applies stops when nothing it measured meets its goal).
With `profiles` the whole curve is measured whatever the goal, and each
profile named gets the choice of its own goal — `default` is `max` (the
highest hashrate), `balanced` (the most efficient with 90 % of it) and
`efficient` (the most hashes per joule) — for the schedule, the
electricity price rule (`electricity.action = "profile:efficient"`) or a
click.

Without an offset search an offset already in place stays as it is. With
an offset every point runs with self-checks; a point that computes wrong
results is measured again at a lower offset, and that lower offset is what
the point is saved with. Points hotter than `temp_max` are measured but
never chosen, a point that comes within 5 °C of the slowdown temperature
is cut short. A measurement during which the pool had no job is taken
again. No run sets a power limit above the ceiling (`power_max`). If a run
fails or is cancelled, the settings from before return.

An offset too high does not always show as wrong results: a kernel can get
stuck on the GPU for good (see [the watchdog](#clock-offset-undervolting)),
and the miner then restarts itself. A run in progress goes on after the
restart, below the offset that did it: what it had measured and decided is
kept step by step (`cavaminer.tune.run.json`). The same holds when a GPU
hung the whole machine or the miner was killed: restart it, start the
miner, and the run goes on (a killed miner restores nothing: the run first
removes the clock locks its interrupted part left in the GPU). A run that
was interrupted like that seven times ends there.

### Results

Every run is kept with all its points (the latest 20 per device,
`cavaminer.tune.json`), and a kept run can be used again without measuring
again:

- any point can be applied: all of its settings are set and saved, in the
  running profile or in another one for when that profile runs;
- any goal can choose from it: the run that found your `balance` setting
  also knows your most efficient one, and the one for 300 W;
- profiles can be saved from it (`default`, names with goals, or both).

The web interface (Tuning) shows each device's runs with the curve as a
chart, the points as a table (sorted as you like, with their share of the
largest as bars), the choice of the run and of the three classic goals
marked, "Show its choice" for any goal, Apply, "Save profiles…" and
Forget. In the menu: ↓ past the actions into the results, ←→ the devices,
`[` `]` older and newer runs, `o` sort, `g` graphs, Enter applies the
point, `s` saves it in a profile, `a` moves to the point a goal chooses,
`p` saves profiles, Del twice forgets the run. From the command line:

```sh
./cavaminer ctl results                              # the kept runs of every device
./cavaminer ctl results 0                            # GPU 0's latest run, point by point
./cavaminer ctl results 0 --pick power:300           # the same, with what that goal would choose marked
./cavaminer ctl results 0 --apply efficiency         # what that goal chooses in it, applied and saved
./cavaminer ctl results 0 --apply 14 --profile night # point 14 into the profile night
./cavaminer ctl results 0 --run 1794620000 --profiles day=hashrate,night=power:300
./cavaminer ctl results cpu --apply balance
./cavaminer ctl results 0 --run 1794620000 --forget
```

The API has the same: `GET /api/v1/tune` (the fields, presets, every
device's state and runs), `GET /api/v1/tune/<device>/runs/<time>` (a run
with its points; `?pick=<goal>` says what a goal would choose),
`POST /api/v1/tune/apply`, `DELETE /api/v1/tune/<device>/runs/<time>`.

The results of the tools of earlier versions — auto-tune and scan runs
(`cavaminer-tune.json`), power sweeps (`cavaminer-sweeps.json`), the CPU
clock sweep — are read into the kept runs the
first time this version starts; the old files stay where they are.

### Clock offset (undervolting)

Outside the safe range: a positive offset of the voltage/frequency curve
runs each clock at a lower voltage, so within a power limit the GPU clocks
higher (two RTX 5090s at 500 W: +9 %; an RTX 3070 at 195 W: +6 %). Too
much offset makes the GPU compute wrong results, and at clocks it was
never tested at it can hang (a reboot is then needed). A tuning run with
`offset = search` finds the offset per GPU while mining (about 15 minutes
on its own; needs root):

```sh
sudo ./cavaminer --tune-preset undervolt             # at the power limit set
./cavaminer ctl tune efficiency --offset search      # as a step of a run for a goal
./cavaminer ctl tune --preset undervolt --offset ..600/25
```

With the GPU at its power limit the search raises the offset in 50 MHz
steps up to 1000 MHz (`offset = ..800/25` for another end and step) with
frequent self-checks: every second attempt is computed twice and all its
tile hashes compared, so a computing error shows as a mismatch. The first
offset with a mismatch ends the search (so do three steps in a row that
change neither the clock nor the power: the voltage is at its floor
there, and more offset would only be a risk); the highest good one less
`offset_margin` (50 MHz) is confirmed for a minute and a half and saved in
the settings with a clock cap (`gpu_offset`, `gpu_clock_max`): the highest
clock that passed at that offset or a higher one, so that neither a light
load nor a change that leaves the GPU power to spare (a lower memory
clock, a higher power limit) can take it to clocks that were not tested.
Each offset is approached in 10 MHz steps of a second each, so that wrong
results show where they begin. Offsets being tried are written to
`cavaminer-offset-trial.json` first: after a hang, the next search stays
below that offset.

While mining with an offset, one attempt in 1024 is checked
(`--self-check`); a failed check lowers the offset by one step and saves
it (in the running profile when that profile sets the offset, else in the
base settings). The miner also re-applies the clock cap or lock within a second
whenever the clock runs above it (for example after an `nvidia-smi -rgc`
from outside) and removes the offset if it cannot. Auto-pause gives other
programs the driver's clocks (no offset, no locks) and restores the tuning
on resume. Run an offset search where the machine can be restarted.

The watchdog: computing errors can also leave a kernel stuck on the GPU
(its threads wait for each other forever; `nvidia-smi` shows 100 % load at
idle power, the driver reports nothing). Nothing but the end of the
process ends such a kernel, so a GPU that returns no result for 30 seconds
makes the miner restart itself, with a saved offset lowered by two steps
first. That works for every reason a kernel may get stuck, with or without
an offset. A tuning run that was going on then continues after the
restart, below the offset on trial.

### The CPU (RandomX)

`device = cpu` tunes the one setting the CPU has, its maximum clock
(`randomx.max_freq`, see RandomX above):

```sh
./cavaminer ctl tune --preset cpu                    # the curve; nothing is changed
./cavaminer ctl tune efficiency --device cpu         # … and the most efficient clock applied
./cavaminer ctl tune balance --device cpu --cpu-clock 3000..4500/100 --profiles default
```

While RandomX keeps mining the run measures the hashrate, the CPU package
power and the hashing cores' clock: first with no maximum (the reference),
then with the maximum CPU clock at each clock tried — `search` steps down
from just below the reference's clock in 250 MHz steps to 60 % of it, at
least 2000 MHz (acpi-cpufreq: its P-states, each with boost off) — about
45 s per point. All CPUs are capped (they share their voltage); afterwards
the maximum returns to its setting, unless `apply` makes the goal's choice
the maximum CPU clock of the running profile, which applies at once.
`profiles` saves the clock of each profile's own goal (with `default`: no
maximum for `max`, the most efficient with 90 % of the hashrate for
`balanced`, the most hashes per joule for `efficient`). The goals are the
GPUs' (`rate` in kH/s), and so are the kept runs and what can be done with
them. Where GPUs mine too, look at their hashrate after a low maximum:
feeding them runs on the same CPU. Needs root, cpufreq and the CPU package
power (RAPL).

### The tuning options of 0.35

The separate tools of earlier versions are runs now; their command-line
options (and `POST /api/v1/tune` with the auto-tune's body) still work and
start the same thing. `cavaminer ctl tune` alone now starts a run with the
tuning settings:

| 0.35 | now |
|---|---|
| `--autotune`, `ctl tune --min-hashrate 90` (the safe auto-tune), with `--tune-min-hashrate 90` | `--tune-preset clocks` (`ctl tune --preset clocks`); the goal `balance:90` |
| the menu's and web interface's scan (an auto-tune at several power limits) | `ctl tune --preset efficiency` (it chooses the power limits itself), or with limits of your own: `--power 220,255,290,330,365` |
| `--autotune-offset` with `--offset-step`, `--offset-max`, `--offset-margin` | `--tune-preset undervolt`, `--tune-offset ..1000/50`, `--tune-offset-margin` |
| `--sweep` with `--sweep-min`, `--sweep-max`, `--sweep-step`, `--sweep-window` | `--tune-preset sweep`, `--tune-power 100..365/5`, `--tune-window` |
| the CPU clock sweep (menu, web interface) | `ctl tune --preset cpu` |
| `--tune-file`, `--sweep-file` | the runs are kept in `cavaminer.tune.json` next to the settings file |
| `GET/POST/DELETE /api/v1/sweep`, `/api/v1/cpu/sweep` (removed) | `/api/v1/tune` |

### What is reset when the miner stops

The miner resets the clock locks and offsets when it exits (Ctrl-C,
SIGTERM, SIGHUP, a crash); the power limit ends at the lower of its
original and requested value, so it is never raised behind your back; the
CPU clock cap and the MSR registers go back to their values. After a hard
crash, `sudo nvidia-smi -rmc` and `sudo nvidia-smi -rgc` reset the locks;
a clock offset left behind is reset when the next run that sets one
(`gpu_offset`, or `--gpu-offset 0`) exits.
Power limits are lost when the driver unloads an idle GPU unless
persistence mode is on (`sudo nvidia-smi -pm 1`). If an overclocking tool
already manages clocks (HiveOS OC profiles, for example), use that
instead: the miner's reset on exit would undo it.

## Profiles and schedule

A profile is a named set of settings over the base ones; it stores only
what differs: which GPUs mine (`none` turns GPU mining off), power limits
and clocks per GPU, the RandomX threads, CPUs, priority and clock cap,
`randomx.enabled = false`, pools, anything the settings screen lists. In
the settings file:

```toml
[profiles.night.randomx]
threads = 32
[[profiles.night.gpu]]
uuid = "GPU-…"
power_limit = 500.0

[profiles.day.miner]
devices = "none"          # no GPU mining during the day
[profiles.day.randomx]
max_freq = 4000           # and a CPU clock cap

[[schedule]]
cron = "0 22 * * *"       # minute hour day month weekday (local time)
profile = "night"
[[schedule]]
cron = "0 7 * * mon-fri"
profile = "day"
```

Time specs are cron's (`*`, `*/n`, ranges, lists, month and weekday
names, `@daily` …). The profile of the entry that fired last runs, so the
right one also applies after a restart; a profile chosen in the menu, the
web interface or the API holds until the next scheduled change;
`--profile` overrides both. On a change the miner restarts itself with the
new settings (a few seconds, plus the RandomX dataset). The electricity
price can also switch to a profile (below). Menu: Automation → Profiles &
schedule; web interface: Automation; command line: `cavaminer config set
… --profile night`.

## Auto-pause

Mining pauses while other programs use a GPU, and resumes once they have
been idle for a while:

```toml
[[autopause]]
processes = ["ollama", "vllm", "llama-server"]   # parts of names or command lines; ["*"] = any other program
threshold = 10        # GPU (SM) use in % that counts as activity (default 10)
combine = "sum"       # "sum" (default): the matching programs' use added up; "max": the busiest one alone
pause_after = 30      # seconds the use must stay at the threshold before mining pauses (default 0 = at once)
resume_after = 600    # seconds without activity before mining resumes (default 300)
interval = 5          # seconds between checks (default 5)
gpus = "same"         # "same" (default): the GPU the program uses; "all": every GPU
cpu = false           # also pause RandomX (default false)
power_limit = 575.0   # optional: power limit while paused, the mining one returns on resume
```

A paused GPU frees its memory for the other program and gets the driver's
default clocks. The per-program use comes from NVML (as `nvidia-smi pmon`;
each program's highest use since the previous check); `cavaminer gpu-procs
[seconds]` lists the programs using each GPU and how much, for writing
triggers. Triggers are edited in the menu (Automation → Auto-pause, one
line of `key=value` pairs), the web interface (Automation) and the API, and
apply at once.

A pause for the price, by auto-pause and by you (`P` in the menu, "Pause"
in the web interface, `cavaminer ctl pause`) each hold on their own: the
miner resumes only when none of them pauses it. Your own pause is kept
across restarts until you resume.

## Electricity price

Mining can follow the electricity price: it runs while the price is low
enough and pauses (or runs another profile) while it is high. Prices come
from a provider (day-ahead spot markets and dynamic tariffs in about 40
countries, below), from a URL or from a command of your own. The price
compared is what you pay per kWh:

    (spot × factor + markup + time-of-day tariffs [+ Danish grid tariffs]) × (1 + VAT/100)

Mining runs while that is at most `max_price` and/or during the
`cheapest_hours` cheapest hours of each day (in the market's time zone);
otherwise `action` applies: `pause` (all mining, the default),
`pause-gpus`, `pause-cpu`, or `profile:<name>` (the miner restarts into
that profile while the price is high, a few seconds plus the RandomX
dataset; pausing is instant and frees the GPUs' memory).

```toml
[electricity]
provider = "energidataservice"   # cavaminer prices --list shows all
area = "DK2"
grid = "radius"                  # Denmark: + grid tariff, Energinet's tariffs and the electricity tax
markup = 0.0                     # supplier markup per kWh
vat = 25.0
max_price = 1.50                 # DKK/kWh incl. all of the above
cheapest_hours = 4               # and the 4 cheapest hours of each day anyway
action = "pause"
```

With `grid` (31 Danish grid companies: `radius`, `cerius`, `n1`,
`konstant`, `trefor`, `trefor-oest`, `dinel`, `rah`, `elnet-midt`, `noe`, …)
the price is what a Danish household pays: the grid company's hourly C
tariff plus Energinet's transmission and system tariffs and the
electricity tax, from Energi Data Service, refreshed twice a day. Other
examples:

```toml
[electricity]                    # Sweden, Nord Pool, 15-min prices in SEK
provider = "nordpool"
area = "SE3"
currency = "SEK"
markup = 0.80                    # energy tax, grid fee, markup per kWh
vat = 25.0
max_price = 1.20

[electricity]                    # any European bidding zone, with a free ENTSO-E token
provider = "entsoe"
area = "DE-LU"
token = "…"
tariffs = [{ when = "* 17-20 * * *", price = 0.08 }]   # cron time of the interval start; each match is added

[electricity]                    # Great Britain, Octopus Agile (price incl. VAT)
provider = "octopus-agile"
area = "C"                       # region letter
max_price = 0.15
```

`max_price` alone mines whenever the price is at most the limit;
`cheapest_hours` alone mines the cheapest N hours of every day; with both,
either is enough. `missing = "pause"` treats an unknown price as too
expensive (the `action` applies) while no price is known for now
(default: mine). `timezone` overrides the market's time zone for the
tariff times and the days of `cheapest_hours`. `enabled = false` keeps the
settings without using them.

**Your own source**: `provider = "url"` with `url = "https://…"`, or
`provider = "command"` with `command = "…"` (run with `sh -c`, 60 s limit).
The answer is either a number (the price now, polled every `interval`
minutes, default 5), `{"price": 1.23}`, or a list of intervals:

```json
[{"start": "2026-10-11T12:00:00Z", "end": "2026-10-11T13:00:00Z", "price": 0.42},
 {"start": 1791723600, "price": 0.39}]
```

(also as `{"prices": [...]}`; times in RFC 3339 or Unix seconds; `end`
defaults to the next start, or to the list's step when the next start is
further away.) The same additions and VAT apply.

Day-ahead prices are fetched every 10 minutes from 12:45 market time until
tomorrow's are in, otherwise every 6 hours; real-time sources every 5
minutes; after a failure the miner tries again after 1, 2, 5, 10, 20 and
then every 30 minutes. Prices are cached in `cavaminer.prices.json`, so a
restart decides at once and a short outage of the source does not matter.
The menu (Automation → Electricity price, shortcut `e`) and the web
interface (Electricity) show the price now, the decision and until when
it holds, a chart of today and tomorrow (green = mining) and all the
settings (applied at once); `cavaminer prices` prints the coming intervals
with the settings applied, `cavaminer prices --list` the providers and
the Danish grid companies.

| provider | source | region | currency | token | price |
|---|---|---|---|---|---|
| `energidataservice` | Energi Data Service (Energinet) | Denmark (also DE, NO2, SE3, SE4) | DKK/EUR |  | day-ahead spot, 15 min, excl. VAT; with `grid = <company>` the Danish tariffs and taxes are added |
| `stromligning` | Strømligning | Denmark, all-in price per grid area | DKK |  | spot + grid tariff + Energinet + electricity tax, excl. VAT (set vat = 25), 15 min; non-commercial use only, 15 requests/15 min |
| `energy-charts` | Energy-Charts (Fraunhofer ISE) | Europe: 40 bidding zones | EUR |  | day-ahead spot, 15 min (CH hourly), excl. VAT; some zones private use only |
| `nordpool` | Nord Pool | Nordics, Baltics, DE-LU, AT, BE, FR, NL, PL, BG, RO, UK | EUR/DKK/NOK/SEK/PLN/GBP |  | day-ahead spot, 15 min (UK hourly, GBP), excl. VAT |
| `entsoe` | ENTSO-E Transparency Platform | Europe: all bidding zones | EUR | yes | day-ahead spot, excl. VAT; free token: register at transparency.entsoe.eu and ask for REST API access |
| `elering` | Elering | Estonia, Latvia, Lithuania, Finland | EUR |  | Nord Pool day-ahead, 15 min, excl. VAT |
| `spot-hinta` | spot-hinta.fi | Finland, Baltics, Norway, Sweden, Denmark | EUR |  | day-ahead spot, 15 min, excl. VAT; one request per minute |
| `elprisetjustnu` | Elpriset just nu | Sweden | SEK/EUR |  | day-ahead spot, 15 min, excl. VAT and taxes |
| `hvakosterstrommen` | Hva koster strømmen | Norway | NOK/EUR |  | day-ahead spot, hourly averages, excl. VAT and grid tariff |
| `porssisahko` | Pörssisähkö.net | Finland | EUR |  | day-ahead spot incl. 25.5 % VAT, 15 min |
| `awattar` | aWATTar | Germany, Austria | EUR |  | EPEX day-ahead spot, hourly, excl. VAT |
| `tibber` | Tibber | Germany, Netherlands, Norway, Sweden (Tibber customers) | EUR/NOK/SEK | yes | your Tibber price incl. VAT and taxes, 15 min; token from developer.tibber.com; area = home number (1, 2, …) |
| `smartenergy` | smartENERGY | Austria | EUR |  | EPEX AT spot incl. 20 % VAT, hourly values in 15-min slots |
| `energyzero` | EnergyZero | Netherlands | EUR |  | NL: spot excl. VAT; NL-all-in: incl. energy tax, purchasing cost and 21 % VAT; 15 min |
| `easyenergy` | easyEnergy | Netherlands | EUR |  | NL: spot excl. VAT; NL-all-in: incl. energy tax, purchasing cost and VAT; 15 min |
| `frank-energie` | Frank Energie | Netherlands, Belgium | EUR |  | NL/BE: spot excl. VAT; NL-all-in: incl. markup, energy tax and VAT; 15 min |
| `groupe-e` | Groupe E Vario | Switzerland (Groupe E grid) | CHF |  | dynamic tariff excl. VAT (vario: energy + grid; vario-grid: grid only), 15 min |
| `ekz` | EKZ Energie Dynamisch | Switzerland (EKZ grid) | CHF |  | dynamic tariff excl. VAT (integrated: energy + grid 400D + fees; energy: energy only), 15 min |
| `pse` | PSE | Poland | PLN |  | SDAC day-ahead (CSDAC), 15 min, excl. VAT |
| `ote` | OTE | Czechia | EUR |  | day-ahead spot, 15 min, excl. VAT |
| `okte` | OKTE | Slovakia | EUR |  | day-ahead spot, 15 min, excl. VAT |
| `ree` | Red Eléctrica (REData) | Spain | EUR |  | ES: day-ahead spot, 15 min; ES-PVPC: regulated PVPC 2.0TD (incl. tolls and charges, excl. VAT and tax), hourly |
| `octopus-agile` | Octopus Energy Agile | Great Britain (regions A–P) | GBP |  | Agile unit rate incl. VAT, 30 min; area = region letter (C = London, A = East England, …) |
| `comed` | ComEd Hourly Pricing | USA: Illinois (ComEd) | USD |  | PJM real-time price for the ComEd zone, 5 min, supply part only; real time (no prices ahead) |
| `nyiso` | NYISO | USA: New York (11 zones) | USD |  | day-ahead zonal LBMP, hourly, wholesale |
| `miso` | MISO | USA: Midwest and South (hubs, or any MISO node) | USD |  | day-ahead LMP (ex-post), hourly, wholesale |
| `caiso` | CAISO OASIS | USA: California (hubs, DLAPs, or any CAISO node) | USD |  | day-ahead LMP, hourly, wholesale |
| `pjm` | PJM Data Miner 2 | USA: PJM (13 states + DC); area = pnode id | USD | yes | day-ahead LMP, hourly; free key from apiportal.pjm.com; area = pnode id (51288 Western Hub, 33092371 ComEd zone) |
| `gridstatus` | GridStatus.io | USA (ERCOT, PJM, CAISO, SPP, MISO, NYISO, ISO-NE) and Canada; area = `<dataset>/<location>` | USD | yes | any GridStatus price dataset (e.g. ercot_spp_day_ahead_hourly/HB_NORTH); key from gridstatus.io |
| `ieso` | IESO | Canada: Ontario | CAD |  | day-ahead Ontario zonal price, hourly, wholesale |
| `aeso` | AESO | Canada: Alberta | CAD |  | pool price, hourly, wholesale; real time (no prices ahead) |
| `aemo` | AEMO NEM | Australia: NSW, QLD, VIC, SA, TAS | AUD |  | wholesale regional price, 5 min actual + 30 min pre-dispatch forecast, excl. GST |
| `amber` | Amber Electric | Australia (Amber customers) | AUD | yes | your Amber price incl. GST (general channel); token from app.amber.com.au/developers; area = site id (default: the first site) |
| `em6` | em6 | New Zealand (6 reference nodes) | NZD |  | wholesale nodal price, 30 min, last 24 h (real time, no prices ahead) |
| `jepx` | JEPX | Japan (system price and 9 areas) | JPY |  | day-ahead spot, 30 min, wholesale |
| `iex` | IEX India | India | INR |  | day-ahead market clearing price, 15 min, wholesale |
| `cenace` | CENACE | Mexico (SIN nodes) | MXN |  | day-ahead nodal price (PML), hourly; area = node code |
| `oree` | OREE | Ukraine (IPS) | UAH |  | day-ahead market price, hourly, wholesale |

Prices marked spot or wholesale exclude VAT, grid fees and taxes: add them
with `markup`, `tariffs` and `vat` if `max_price` is meant as the price you
pay. Some sources ask for attribution when their prices are shown publicly
or are for non-commercial use (Strømligning, some Energy-Charts zones, Nord
Pool's terms); for scheduling your own miner that is fine.

## The menu

In a terminal (also inside tmux or screen) the miner shows an interactive
menu. It is a tree beside the screens: Tab (or Esc from a screen) moves
the keys to it, ↑↓ choose, Enter opens, Esc or Tab goes back to the
screen; on terminals under 100 columns it takes the whole width while it
has the keys. The line above the keys shows where you are (for example
"Mining › PearlHash pools") and messages; the bottom line shows the keys
of the screen.

| menu | |
|---|---|
| Dashboard | per-GPU hashrate, shares, power / limit / ceiling, efficiency, clocks, temperature, fan, locks and state; the CPU (with its power as root); a hashrate graph per algorithm; the log |
| Mining | GPUs (power limit, ceiling, clock locks, cap and offset, fan speed, temperature limit, kernel: applied at once and saved; Enter lists the clocks the driver takes and the kernels the GPU runs), PearlHash pools and RandomX pools (ordered lists with failover), PearlHash settings, RandomX settings, Kernel (advanced) |
| Tuning | the tuning settings (the fields of a run: what to try, the goal, what to do with the result), beside them what the run they make would do; Start, the presets, the defaults; below, each device's runs with their points (table and graphs; Enter applies a point) |
| Automation | Profiles & schedule, Electricity price (chart and settings), Auto-pause triggers |
| System | Web interface & API, Statistics, Output & logging (log level, status lines), Log (scrollable), Help |
| Restart, Quit | restart with the saved settings; quit (restores clocks and power limits) |

Every settings screen comes from the same list of settings the web
interface, the API and `cavaminer config` use: Enter edits — on a setting
with a list of values (price source, area, grid company, clocks, …) it
opens the list with what each value means: type to filter, ↑↓ and Enter
choose, "other value…" where the list may be incomplete — ←→ steps through
the list, Del (or Backspace) goes back to the default, `[` `]` switch between the base
settings and the profiles (a profile stores only what differs, and a
profile that is not running takes its settings when it runs). Settings
marked "restart" apply after Restart.

| screen | keys |
|---|---|
| everywhere | Tab menu, `P` pause / resume all mining (kept until resumed), `?` or F1 help, `q` quit, Ctrl-L redraw; shortcuts `d` dashboard, `s` GPU settings, `p` profiles, `a` auto-pause, `u` tuning, `e` electricity, `l` log (a screen's own keys come first: `a` and `e` on profiles, `e` and `l` on auto-pause and the pools, `s` `a` `p` in the tuning results) |
| GPUs | ↑↓ select, ←→ or `[` `]` profile, Enter edit (clocks, kernel, k, m: a list of the values the GPU takes) |
| settings groups | ↑↓ select, Enter edit or list, ←→ next value, Del or Backspace default, `[` `]` profile |
| pools | ↑↓←→ cell, Enter edit, `+` add, Space on/off, Shift+↑↓ (or `K`/`J`) move, `x` delete |
| profiles & schedule | ↑↓ select, Enter run the profile now, `e` edit its settings, `n` new profile, `+` schedule entry, `x` delete |
| auto-pause | ↑↓ select, `+` add, `e` edit, `t` on/off, `x` delete |
| tuning | ↑↓ setting, Enter edit or list (on an action: start, plan, preset, defaults; a run with an offset search: Enter twice), ←→ next value, Del default, `r` preset, `c` cancel the runs; ↓ past the actions into the results (at the run's choice): ←→ device, `[` `]` older/newer run, `o` sort, `g` graphs, Enter apply that point, `s` save it in a profile, `a` the row a goal chooses (`power:300`), `p` save profiles (`default`, or `night=power:300,…`), Del twice forgets the run, ↑ from the first row or Esc back |
| log | ↑↓ PgUp PgDn scroll, End follow |
| RandomX CPUs (picture) | arrows move, Space core, `l` L3 cache, `s` socket (custom / optimal / all / off), `a` automatic, `n` threads in all, `p` per socket, `t` type the list, `c` none, Enter save, Esc cancel |

Text fields edit like a shell line (←→, Home/End, Ctrl-←→ by word,
Ctrl-U/K/W; Enter keeps, Esc drops the change). `NO_COLOR` makes the menu
monochrome.

## The web interface

The miner serves a web interface, the REST API, `/summary` (HiveOS) and
`/metrics` (Prometheus) on the `miner.api` address (`--api`; default
`127.0.0.1:4078`, this machine only; `0.0.0.0:4078` for the network; `0`
turns it off). `web.tls = true` serves HTTPS with a self-signed certificate
made once (`cavaminer.web.crt` / `.key` next to the settings), or with
`web.cert` / `web.key` of your own. Dark and light themes; works on a
phone.

| page | |
|---|---|
| Dashboards | your own: tabs, each a grid of widgets — a value with a sparkline, charts of any metrics over 1 hour to 1 year (with event markers), the GPU table, the CPU (hashrate, power, efficiency), the electricity price, controls (pause, resume, profile, restart), events, the log. "Edit dashboard" adds, moves, resizes and removes widgets and dashboards |
| Miners | controls, PearlHash and RandomX state, the GPU and CPU tables with their tuning, the electricity decision, version and uptime |
| Statistics | any metrics over any range as a chart, the events in it, CSV export |
| Electricity | the price now, the decision, the price chart from yesterday to tomorrow, the provider's notes and all the price settings |
| Settings | every setting but the tuning settings (they are the Tuning page's form), per profile, with its help; GPU settings applied at once (clocks from the driver's list, power limits with their range, clock offset, fans, temperature limit, kernel); "Choose CPUs…" for RandomX |
| Pools | the pool lists of each algorithm and profile: order, on/off, logins, TLS fingerprints |
| Automation | profiles (run, delete, create), the schedule (with the next time of each entry), the auto-pause triggers |
| Tuning | a tuning run as a form (the devices, the goal, what to try on a GPU or the CPU, what to do with the result, how to measure), quick setups for the usual runs, what the run would do and how long before it starts, the same run as a command line; each device's runs with the curve as a chart and the points as a table, any point or any goal's choice applied (to the running profile or another), profiles saved from a run |
| Log | the log, filtered, following |
| Account | your login, password and two-factor setup; users and API tokens (admin) |
| Documentation | this document |
| API | every endpoint described, each can be tried |

### Access from other machines

Until a user exists, only this machine (the loopback address) can use the
web interface and the API, without a login, and only under its own
address in the browser (`127.0.0.1`, `localhost` or the machine's name;
so a web site you visit cannot reach the miner by pointing its own name
at your machine); API tokens work from anywhere. Create a user to use it
from elsewhere, with two-factor login if you like:

```sh
sudo ./cavaminer user add cavauser --totp    # asks for the password, shows a QR code for the authenticator app
sudo ./cavaminer token add home-assistant    # an API token for scripts and Home Assistant (shown once)
./cavaminer config set miner.api 0.0.0.0:4078
./cavaminer config set web.tls true          # HTTPS (a self-signed certificate is made; or web.cert / web.key)
```

Users are `admin` (everything) or `viewer` (read only, no secrets).
Passwords are stored as PBKDF2 hashes, tokens as SHA-256 hashes, both in
`cavaminer.auth.json` (readable by its owner only); logins last
`web.session_hours` (a week) and survive restarts; five failed logins
block the client for 15 minutes. Users and tokens can also be managed in
the web interface (Account) and the API.

Users and tokens work from anywhere by default. Each can be limited to
this machine (`--local-only` on `user add` / `token add`, later `cavaminer
user access <name> local|any`, `cavaminer token access <name> local|any`,
or the Account page), and `web.remote_users` / `web.remote_tokens` set to
false limit all users / all tokens to it. The rules are checked on every
request, so a change also ends open sessions from elsewhere. "This
machine" is the loopback address (127.0.0.1, ::1): behind a reverse proxy
on the same machine every request looks local, so leave these to the
proxy there. `/summary` is for this machine only unless
`web.public_summary` is on.

## REST API

`/api/v1`, JSON; `Authorization: Bearer <token>` (or the web session;
requests from a browser session that change something need the header
`X-CavaMiner: 1`). The API page of the web interface describes every
endpoint (parameters, bodies, responses, examples) and can try each; the
same description as OpenAPI 3 is at `/openapi.json` (for Swagger, Postman
or code generators). In short:

| | |
|---|---|
| status | `GET /status` |
| settings | `GET /settings[?profile=…]` (the schema and values of every setting), `PUT /settings` (`{"key": "value", …}`, an empty value = default; the lists `pools.pearl`, `pools.randomx`, `schedule` and `autopause` take a JSON list); `PUT /gpus/<gpu>/settings` (`power_limit`, `power_max`, `mem_clock`, `gpu_clock`, `gpu_clock_max`, `gpu_offset`, `fan_speed`, `temp_limit`, `kernel`, `k`, `m`, applied at once; `<gpu>`: a GPU number, UUID or PCI address) |
| pools | `GET /pools`, `PUT /pools/pearl` and `/pools/randomx` |
| profiles | `GET /profiles`, `POST /profiles`, `DELETE /profiles/<name>`, `POST /profiles/<name>/run`, `PUT /schedule` |
| auto-pause | `GET/PUT /autopause` |
| control | `POST /pause` (`{"what": "all|gpus|cpu"}`), `POST /resume`, `POST /restart`, `POST /stop` |
| tuning | `GET /tune` (the fields, presets, every device's state, limits and runs), `POST /tune` (start a run: `{"preset": "full", "goal": "balance:85", "kernel": "search", "power": "200..450", …}`; an empty body runs the saved tuning settings; `"plan": true` only says what it would do), `DELETE /tune[?device=…]` (cancel), `GET /tune/<device>/runs/<time>[?pick=<goal>]`, `DELETE /tune/<device>/runs/<time>`, `POST /tune/apply` (`{"device": 0, "point": "efficiency"}`: a point's number, `best` or a goal; `profile`, `profiles`); `<device>`: a GPU number, UUID or PCI address, or `cpu` |
| RandomX CPUs | `GET /cpu` (the CPU's layout), `GET /cpu/plan?threads=&per_socket=&affinity=` (the CPUs the threads would get) |
| electricity | `GET /electricity`, `GET /electricity/providers` |
| statistics | `GET /history?metrics=a,b&from=&to=&points=`, `GET /metrics` (the recorded metrics), `GET /events`, `GET /log?lines=`, `GET/PUT /dashboards` |
| accounts | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/password`, `POST|PUT|DELETE /auth/totp`, `GET/POST /users`, `PUT/DELETE /users/<name>`, `GET/POST /tokens`, `PUT/DELETE /tokens/<name>` |

Outside the API: `GET /summary` is the plain JSON snapshot HiveOS reads
(hashrate, shares, per-GPU hashrate, power, temperature, fan, clocks, the
CPU), and `GET /metrics` the Prometheus text format.

## Prometheus

`GET /metrics` (with an API token or a login; from this machine without
one only while no user is set up) exports gauges and
counters named `cavaminer_…`: `hashrate{algo}`, `gpu_hashrate`,
`gpu_power_watts`, `gpu_power_limit_watts`, `gpu_temperature_celsius`,
`gpu_fan_percent`, `gpu_clock_mhz`, `gpu_paused` (all with `gpu` and
`name` labels), `shares_total{algo,result}`, `electricity_price{unit}`,
`electricity_mining`, `electricity_gpu_cost_per_hour{currency}`,
`electricity_cost_per_hashrate{currency}`, `devfee_active{algo}`,
`devfee_shares_total{algo,result}` and `uptime_seconds`.

## Home Assistant

The package's `integrations/homeassistant/custom_components/cavaminer` is
a Home Assistant integration: copy that folder into Home Assistant's
`config/custom_components/`, restart Home Assistant, add "CavaMiner"
(Settings → Devices & services) with the miner's address and an API token
(`cavaminer token add home-assistant`; the miner's `miner.api` must be
reachable from Home Assistant). It makes sensors of everything the status
has (hashrates, shares, every GPU's power, temperature, fan, clocks,
efficiency and state, the CPU and its power, the electricity price and
decision, the profile; the dev fee as a binary sensor), a mining switch (pause/resume), a
profile select, buttons for a restart and for tuning runs (the saved
tuning settings, the usual presets, cancel), each GPU's power limit,
ceiling, clock locks, clock cap and offset,
fan speed and temperature limit as numbers and its kernel as a select, and
an entity for every setting of the miner (switch, number, select or text by
type; the kernel and tuning settings disabled by default). The lists (pools, schedule, auto-pause triggers) are sensors
with the entries as an attribute. Any setting can be changed with the
service `cavaminer.set_setting` (key, value — a list for the lists —,
optional profile); also `cavaminer.pause`, `resume`, `restart`,
`run_profile`, `tune` (a tuning run with its fields), `tune_cancel` and
`tune_apply`. Its own README has the
details.

## Command line: config and ctl

Every setting can be read and set from the command line, and the running
miner controlled through its API:

```sh
./cavaminer config list [--all] [--profile night]   # the settings (and their defaults)
./cavaminer config set electricity.max_price 1.5     # saved; a running miner reads it within seconds
./cavaminer config set randomx.threads 24 --profile night
./cavaminer config set gpu.0.power_limit 400         # GPU 0 (a GPU number, UUID or PCI address)
./cavaminer config unset electricity.max_price
./cavaminer config set schedule '[{"cron": "0 22 * * *", "profile": "night"}]'   # lists as JSON
./cavaminer config get pools.pearl                   # (pools.randomx, schedule, autopause)
./cavaminer --set electricity.max_price=1.2 …        # for this run only
./cavaminer ctl status | pause [all|gpus|cpu] | resume | restart | stop
./cavaminer ctl tune [GOAL] [--preset NAME] [--device D] [--kernel …] [--power …] [--plan]   # a tuning run; see Tuning
./cavaminer ctl results [DEVICE] [--pick GOAL] [--apply POINT] [--profiles LIST]   # the kept runs and what to do with them
./cavaminer config set tune.window 45                # a tuning setting: what a run uses when its request says nothing else
./cavaminer ctl set gpu.0.power_limit 380            # through the running miner's API (applied at once)
./cavaminer ctl set gpu.1.kernel mma23               # GPU 1 starts again with that kernel
```

`ctl` talks to the running miner's API (its address from the settings);
with users set up it needs a token (`--token` or `CAVA_TOKEN`). The keys
are those of `config list --all` (also the command-line names, e.g.
`rx_threads`).

## Statistics

Every 10 seconds (`stats.interval`) the miner records each GPU's hashrate,
power, power limit and ceiling, temperature, fan, clocks, efficiency and
tuning (offset, clock locks and cap), shares, RandomX (and, as root, the
CPU's package power from its RAPL counters), the electricity price, limit
and decision, what the GPUs' electricity costs (`electricity.gpu_cost`,
per hour, and `pearl.cost_per_hashrate`, per TH/s per day: the cost side
of mining's "hashprice"), and pauses — plus events (starts, restarts,
pauses, profile changes, price decisions, tuning results, settings
changes) — in `cavaminer.stats.db` (SQLite). Older samples become
averages (`stats.downsample`, default `1d:1m, 14d:15m, 180d:1h, 2y:1d`:
after a day 1-minute averages, after two weeks 15-minute ones, …, min and
max kept), samples older than `stats.retention` go (default `unlimited`;
e.g. `90d`, `6m`, `2y`), and the file stays under `stats.max_size`
(default `1GB`; the oldest samples go first and the space is freed). The
web interface's charts, the Statistics page (with CSV export) and the
API's `/history` read them; `stats.enabled = false` turns the
recording off.

## Dev fee

CavaMiner mines a share of the time for its development: 1 % of the
PearlHash and 1 % of the RandomX mining time (one minute per 100 minutes
of mining each). It pays for, among other
things, hardware to support and tune for more GPUs and CPUs. The first
window comes at a random point of the first 100 minutes; paused time
(electricity price, auto-pause, by you) does not count. Your pool
connection stays open meanwhile and mining returns to your pool's latest
job right after.

While it runs, the log says `dev fee: mining for CavaMiner's development`,
the menu shows `DEV FEE PearlHash 1 %` (or RandomX 1 %), the web interface
a "dev fee" badge, and `/api/v1/status` (`devfee`), Prometheus
(`cavaminer_devfee_active`) and Home Assistant (a "Dev fee" binary sensor) report
it; its shares are counted apart from yours. The dev-fee connections go
over TLS, with the certificate pinned, to `prl.devfee.cavalius.net` and
`xmr.devfee.cavalius.net` (port 443). If they cannot be reached, or send
no job within 10 seconds, the miner keeps mining for you and tries again
100 minutes of mining later; RandomX skips the dev fee when its pool works
on another seed than yours (a coin other than Monero), so the dataset is
never rebuilt for it. A dry run (`--dry-run`) has no dev fee.

## Reference

### Command-line options

`cavaminer [options] [command]`. Without a command the miner mines;
options also take the form `--option=value`.

Mining and pools:

| option | default | |
|---|---|---|
| `-o, --url <url>` | | PearlHash pool, `host:port` or `stratum+ssl://host:port` (repeat for failover; replaces the list of the settings file; also `PEARL_POOL`) |
| `-u, --user` | | PearlHash login: `wallet` or `wallet.worker` (for pools without a login of their own; `PEARL_USER`) |
| `-w, --worker` | | worker name, for pools without one of their own (overrides the `.worker` part of `--user`; `PEARL_WORKER`) |
| `-p, --password` | `x` | PearlHash pool password, for pools without one of their own (sent with the login when it is not `x`) |
| `-d, --devices` | `all` | GPU numbers, e.g. `0,1` (the order of `nvidia-smi` and `cavaminer devices`), or `none` |
| `--proof` | `zst` | share encoding: `zst` (about 3 KB) or `plain` (about 136 KB) |
| `--job-timeout` | `180` | reconnect when the pool sends no job for this many seconds (at least 30) |
| `--dry-run` | | mine and verify shares without submitting them (no dev fee) |
| `--rx-url <url>` | | RandomX pool, `host:port` (repeat for failover; replaces the list; `CAVA_RX_POOL`) |
| `--rx-user` | | RandomX login (for pools without one): the wallet address; for p2pool any name, `name+N` fixes the share difficulty (`CAVA_RX_USER`) |
| `--rx-pass` | `x` | RandomX pool password, for pools without one of their own (usually the worker name) |
| `--rx-enabled` | `true` | RandomX on or off (a profile can switch it off and keep the pools) |

GPU settings (one value for all GPUs or a comma-separated list, one per GPU in `-d` order; need root):

| option | default | |
|---|---|---|
| `--power-limit` | | power limit in W, set before mining starts |
| `--power-max` | | hard power ceiling in W (tuning and the menu stay below); default `--power-limit`, else the limit at start |
| `--mem-clock` | | lock the memory clock (MHz) while mining |
| `--gpu-clock` | | lock the GPU clock (MHz) while mining |
| `--gpu-clock-max` | | highest GPU clock (MHz), the clock can still drop |
| `--gpu-offset` | | clock offset of the voltage/frequency curve (MHz, undervolting) |
| `--fan-speed` | | fixed fan speed in percent (the driver's fan control returns on exit and while paused) |
| `--temp-limit` | | temperature limit in °C: above it the GPU clock is lowered until the GPU cools |
| `--kernel` | `auto` | the kernel (see Kernels); needs no root |

Tuning (a tuning run at the start; each `--tune-<field>` is the tuning field of that name, its default the setting `tune.<field>`; see Tuning):

| option | default | |
|---|---|---|
| `--tune [goal]` | | start a tuning run a minute after the start, then keep mining with its result; the goal as `--tune-goal` |
| `--tune-preset <name>` | | a named setup for the fields (and starts the run): `balance`, `hashrate`, `efficiency`, `clocks`, `kernels`, `sweep`, `undervolt`, `full`, `cpu` |
| `--tune-device` (`--tune-gpu`) | `gpus` | what is tuned: `gpus`, `cpu`, or GPUs by number, UUID or PCI address |
| `--tune-goal` | `balance:90` | `hashrate`, `efficiency`, `balance[:percent]`, `power:<watts>`, `rate:<TH/s>`, `knee[:percent]` |
| `--tune-kernel` | `keep` | the kernels: `keep`, `search`, or `mma52,mma23:16384:4096` |
| `--tune-memory` | `search` | the memory clocks: `keep`, `search`, `7001..`, or `default,7001,5001` |
| `--tune-power` | `search` | the power limits: `keep`, `search`, `200..450`, or `300,350`, `200..450/25` |
| `--tune-clock` | `search` | the GPU clock locks: `keep`, `search`, `1000..`, or `none,1500,1400` |
| `--tune-offset` | `keep` | the clock offset: `keep`, `none`, `search` (undervolting; outside the safe range), `..800/25` |
| `--tune-offset-margin` | `50` | the offset kept stays this far (MHz) below the highest one without errors |
| `--tune-cpu-clock` | `search` | on the CPU, its maximum clocks: `search`, `3000..`, `4500,4000`, or `keep` |
| `--tune-method` | `staged` | `staged` (each setting in turn) or `grid` (every combination) |
| `--tune-window` | `30` | seconds each setting is measured |
| `--tune-settle` | `auto` | seconds before each measurement |
| `--tune-temp-max` | `auto` | settings hotter than this (°C) are never chosen |
| `--tune-apply` | `true` | apply and save the goal's choice; `false`: only measure |
| `--tune-profiles` | `none` | `default`, `name=goal,…` or both: profiles that get their own goal's choice |
| `--self-check` | `1024` with an offset, else off | every this many attempts one is computed twice and compared; 0 = off |

RandomX:

| option | default | |
|---|---|---|
| `--rx-threads` | `0` | hashing threads; 0 = from the caches (see RandomX on the CPU) |
| `--rx-threads-per-socket` | `0` | that many threads on every socket instead; 0 = off |
| `--rx-affinity` | `auto` | CPUs for the threads, e.g. `0-15,64-79` (with `--rx-threads 0`: one thread per listed CPU) |
| `--rx-nice` | `19` | priority of the hashing threads (0 normal … 19 lowest) |
| `--rx-huge-pages` | `true` | 2 MiB pages for the dataset, cache and scratchpads (reserved as root) |
| `--rx-1gb-pages` | `false` | the dataset on three 1 GiB pages (reserved as root) |
| `--rx-msr` | `true` | the MSR tweak (AMD Zen 2 to 5, Intel; as root, restored on exit) |
| `--rx-max-freq` | `0` | maximum CPU clock in MHz for all CPUs while RandomX mines; 0 = off (as root, restored on exit and while paused) |

Settings, output and process:

| option | default | |
|---|---|---|
| `--config` | `cavaminer.toml` | the settings file (everything else is kept next to it) |
| `--profile` | | run this profile (the schedule and the menu's choice are then ignored; `base` = none) |
| `--set key=value` | | a setting for this run only (any key of `config list --all`; repeatable) |
| `--api` | `127.0.0.1:4078` | address of the web interface, API, `/summary` and `/metrics`; `0` = off |
| `--status-interval` | `30` | seconds between status lines (without the menu; at least 5) |
| `--log` | `info` | log level (`info`, `debug`, `warn`, or filters such as `cavaminer=debug`) |
| `--log-file` | | also write the log to this file (default with `--daemon`: `cavaminer.log` next to the settings file) |
| `--no-tui` | | log lines instead of the menu |
| `--plain` | | plain text: no menu, no colours or other control codes, simple prompts |
| `-q, --quiet` (`--silent`) | | no output at all (the log still goes to `--log-file`) |
| `-B, --daemon` (`--background`) | | run in the background |
| `--pid-file` | | write the process id here (default with `--daemon`: `cavaminer.pid` next to the settings file) |

PearlHash kernel (advanced; the defaults are the measured best, change them only for experiments):

| option | default | |
|---|---|---|
| `--kernel` | `auto` | the kernel, one for all GPUs or one per GPU (`mma52,mma23`): `auto` = `mma52` on the RTX 50 series, `mma17g` on the RTX 30 series, else `mma17h`; also `mma17`, `mma17p`, `mma23`, `mma23h`, `mma23p`, `mma51`, and the signal-0 experiments `mma50`, `mma50s` (see Kernels; every GPU mines with its own kernel's hash tiles) |
| `--m` | `0` | rows of A per attempt; 0 = automatic (16384; 8192 with the resident RTX 50 kernels) |
| `--n` | `65536` | columns of B per job (a wide B amortises the preparation of A) |
| `--k` | `0` | common dimension, a multiple of 2048; 0 = automatic per GPU (8192 for a kernel that builds its operand in the kernel on an L2 of at least 4 MB, else 4096 on GPUs with a large L2, else 2048) |
| `--signal` | `63` | the constant signal value of the matrices, -64 to 64 (63 keeps every GPU operand non-negative, which saves energy; the RTX 50 kernels take 63 or 64 only) |
| `--stages` | `4` | pipeline stages of the GEMM |
| `--group` | `0` | raster group size; 0 = from the L2 size |
| `--local-diff` | | testing: this share difficulty instead of the pool's (with `--dry-run` only) |

Commands (each takes `--config`):

| command | |
|---|---|
| `devices` | the GPUs, numbered in PCI bus order, with the CUDA and driver versions, the settings each gets and what the next start would change |
| `gpu-procs [seconds]` | the programs using each GPU and how much (for auto-pause triggers) |
| `hugepages [--threads N] [--persist]` | show and reserve the huge pages RandomX needs (as root); `--persist` also reserves them at boot |
| `rx-bench [seconds] [--v2]` | an offline RandomX benchmark with the RandomX settings (no pool), 60 s by default; `--v2`: RandomX v2 |
| `prices [--list]` | the coming electricity prices with the settings applied; `--list`: the providers and Danish grid companies |
| `config list [--all] [--profile P]`, `config get KEY`, `config set KEY VALUE`, `config unset KEY` | the settings file |
| `ctl status / pause [all|gpus|cpu] / resume / restart / stop / tune [GOAL] [--preset NAME] [--<field> VALUE]… [--plan] [--status] [--cancel] / results [DEVICE] [--run TIME] [--pick GOAL] [--apply POINT] [--profile NAME] [--profiles LIST] [--forget] / set KEY VALUE` | the running miner, through its API (`--token` or `CAVA_TOKEN` once users exist) |
| `user add NAME [--role admin|viewer] [--totp] [--local-only]`, `user access NAME local|any`, `user passwd NAME`, `user totp NAME [--off]`, `user del NAME`, `user list` | the web interface's users |
| `token add NAME [--role …] [--local-only]`, `token access NAME local|any`, `token del NAME`, `token list` | API tokens |
| `stop [--pid-file F]` | stop the miner running in the background |

### Settings file

`cavaminer.toml` (`--config`), TOML. The keys as `cavaminer config list
--all`, the menu and the web interface name them (`section.key` is
`[section]` / `key = …` in the file), with their defaults; "profile" means
a profile can override it; "restart" that a change applies after a
restart (everything else applies at once).

| key | default | | |
|---|---|---|---|
| `miner.devices` | `all` | profile, restart | GPUs: `all`, a list such as `0,1`, or `none` |
| `pool.proof` | `zst` | profile, restart | share encoding `zst` or `plain` |
| `miner.dry_run` | `false` | profile, restart | mine and check shares without sending them |
| `miner.job_timeout` | `180` | profile, restart | seconds without a new job before reconnecting |
| `miner.follow_gpus` | `true` | restart | a card moved to another slot keeps its settings |
| `randomx.enabled` | `true` | profile, restart | RandomX on or off |
| `randomx.threads` | `auto` | profile, restart | hashing threads: `auto` or a number |
| `randomx.threads_per_socket` | `off` | profile, restart | threads on every socket instead |
| `randomx.affinity` | `auto` | profile, restart | the CPUs, e.g. `0-15,32-47` |
| `randomx.nice` | `19` | profile, restart | thread priority, 0 normal … 19 lowest |
| `randomx.huge_pages` | `true` | profile, restart | 2 MiB pages |
| `randomx.pages_1gb` | `false` | profile, restart | the dataset on 1 GiB pages |
| `randomx.msr` | `true` | profile, restart | the MSR tweak |
| `randomx.max_freq` | `off` | profile | maximum CPU clock in MHz for all CPUs while RandomX mines |
| `miner.m`, `miner.n`, `miner.k`, `miner.signal`, `miner.kernel`, `miner.stages`, `miner.group` | as the options | profile, restart | the PearlHash kernel (advanced) |
| `tune.device`, `tune.goal`, `tune.kernel`, `tune.memory`, `tune.power`, `tune.clock`, `tune.offset`, `tune.offset_margin`, `tune.cpu_clock`, `tune.method`, `tune.window`, `tune.settle`, `tune.temp_max`, `tune.apply`, `tune.profiles` | as the fields (see Tuning) | | the tuning settings: what a tuning run does when its request says nothing else (`[tune]` in the file) |
| `miner.api` | `127.0.0.1:4078` | profile, restart | where the web interface, API, `/summary` and `/metrics` listen; `0` = off |
| `web.tls` | `false` | restart | HTTPS (a self-signed certificate is made unless `web.cert` and `web.key` are set) |
| `web.cert`, `web.key` | | restart | PEM certificate chain and private key |
| `web.session_hours` | `168` | | hours a login lasts |
| `web.public_summary` | `false` | | `/summary` for every client, not only this machine |
| `web.remote_users`, `web.remote_tokens` | `true` | | users / API tokens may be used from other machines |
| `stats.enabled` | `true` | restart | record statistics |
| `stats.interval` | `10` | | seconds between samples |
| `stats.retention` | `unlimited` | | e.g. `90d`, `6m`, `2y` |
| `stats.max_size` | `1GB` | | e.g. `500MB`, `2GB`, `unlimited` (with the unit; at least 1MB) |
| `stats.downsample` | `1d:1m, 14d:15m, 180d:1h, 2y:1d` | | `<age>:<resolution>, …` |
| `miner.log` | `info` | profile, restart | log level |
| `miner.status_interval` | `30` | profile, restart | seconds between status lines |
| `electricity.enabled` | `true` | | `false` keeps the price settings without using them |
| `electricity.provider` | | | a provider id (`cavaminer prices --list`), `url` or `command`; empty = off |
| `electricity.area` | the provider's first | | the price area or region, e.g. `DK1` |
| `electricity.currency` | the provider's first | | where the provider has several |
| `electricity.token` | | | API token for providers that need one |
| `electricity.url` | | | your own source: the URL (`provider = "url"`) |
| `electricity.command` | | | your own source: the command (`provider = "command"`) |
| `electricity.interval` | `5` | | minutes between polls of your own source |
| `electricity.grid` | | | Danish grid company |
| `electricity.factor` | `1` | | spot price × factor (e.g. a currency conversion) |
| `electricity.markup` | `0` | | added per kWh (supplier markup, taxes not covered otherwise) |
| `electricity.tariffs` | | | time-of-day additions: `<cron time> = <price>; …` (a list of `{ when, price }` tables in the file) |
| `electricity.vat` | `0` | | VAT in percent, applied to the sum |
| `electricity.max_price` | | | mine while the price per kWh is at most this |
| `electricity.cheapest_hours` | `0` | | also mine during this many cheapest hours of each day |
| `electricity.action` | `pause` | | `pause`, `pause-gpus`, `pause-cpu` or `profile:<name>` |
| `electricity.missing` | `mine` | | `mine` or `pause` while no price is known |
| `electricity.timezone` | the market's (your own source: the system's; set it on Windows) | | for the tariff times and the cheapest hours |
| `pools.pearl`, `pools.randomx` | `[]` | profile, restart | the pool lists (`[[pools]]` and `[[randomx.pools]]` tables in the file; JSON lists on the command line and in the API) |
| `schedule` | `[]` | | `[[schedule]]` entries: `cron`, `profile` |
| `autopause` | `[]` | | `[[autopause]]` triggers (see Auto-pause) |

GPU settings are `[[gpu]]` tables with `uuid`, `name`, `pci_bus_id` and
`power_limit`, `power_max`, `mem_clock`, `gpu_clock`, `gpu_offset`,
`gpu_clock_max`, `fan_speed`, `temp_limit`, `kernel`, `k`, `m`
(`gpu.<GPU>.<field>` for `--set`, `config set` and `ctl
set`; `ctl set` applies at once, `config set` after a restart); profiles are `[profiles.<name>.miner]`, `[profiles.<name>.randomx]`,
`[profiles.<name>.pool]`, `[[profiles.<name>.pools]]`,
`[[profiles.<name>.randomx.pools]]` and `[[profiles.<name>.gpu]]` sections
with the same keys. The file also records the profile chosen by hand
(`[manual]`) and a pause by you (`paused`).

### Files

Next to the settings file (`cavaminer.toml` → `cavaminer.<ext>`):

| file | |
|---|---|
| `cavaminer.toml` | the settings |
| `cavaminer.stats.db` (and `-wal`, `-shm`) | the statistics and events (SQLite); also the saved dashboards |
| `cavaminer.auth.json` | users and API tokens (hashed); readable by its owner only |
| `cavaminer.prices.json` | the cached electricity prices and tariffs |
| `cavaminer.tune.json` | the tuning runs with their points (the latest 20 per device) |
| `cavaminer.tune.run.json` | a tuning run in progress (it goes on after a restart; removed when the run ends) |
| `cavaminer.web.crt`, `cavaminer.web.key` | the self-signed certificate for HTTPS |
| `cavaminer.log`, `cavaminer.pid` | the log and process id of a `--daemon` (unless `--log-file` / `--pid-file` say otherwise) |
| `cavaminer-offset-trial.json` | the offsets an offset search is trying (after a hang the next search stays below them) |

`cavaminer hugepages --persist` writes
`/etc/sysctl.d/60-cavaminer-hugepages.conf`. The result files of earlier
versions (`cavaminer-tune.json` and `cavaminer-sweeps.json` in the
directory the miner is started from, `cavaminer.cpusweep.json`) are read into `cavaminer.tune.json` once and
stay where they are. Files written under the miner's previous name
(`pearlminer.toml`, `pearlminer-sweeps.json`, `pearlminer-tune.json`) are
renamed on the first start when the default names are used.

### Environment variables

| variable | |
|---|---|
| `PEARL_POOL`, `PEARL_USER`, `PEARL_WORKER` | as `-o`, `-u`, `-w` |
| `CAVA_RX_POOL`, `CAVA_RX_USER` | as `--rx-url`, `--rx-user` |
| `CAVA_TOKEN` | the API token for `cavaminer ctl` |
| `NO_COLOR` | no colours in the log, a monochrome menu |
| `TZ` | the local time zone (the schedule; the electricity price with your own source) |
| `CAVA_RX_NUMA=0` | one RandomX dataset for all NUMA nodes instead of one per node |

### Signals

SIGINT (Ctrl-C) and SIGTERM stop the miner and restore the GPUs and the
CPU; SIGHUP restarts a `--daemon` with the saved settings (also after the
binary was replaced by a newer one) and stops a miner in the foreground
(`cavaminer ctl restart` restarts either). On Windows, Ctrl-C, closing the
window, logging off and shutting down stop it, with the GPUs restored;
`cavaminer ctl restart` restarts it.

## Troubleshooting

| | |
|---|---|
| "the NVIDIA driver supports CUDA x.y, but this build's kernels need …", "RTX 50 series GPUs need an NVIDIA driver of at least 575" | the driver is too old: 525 or newer (580 for the CUDA 13 kernels), RTX 50 series 575 or newer |
| "nothing to mine" | no pool is set: run the first-start questions in a terminal, or give `-o` / `--rx-url` |
| "another miner (pid …) is running" | a background miner with the same pid file: `cavaminer stop` first |
| the web interface is not reachable from another machine | `miner.api` is `127.0.0.1:4078` (this machine only): set `0.0.0.0:4078` and create a user (`cavaminer user add`); API tokens work without one |
| RandomX is slow, "huge pages" warnings | the huge pages are not reserved: start as root once, or `sudo cavaminer hugepages --persist` |
| RandomX shows fewer threads than cores | the default is what the caches hold (2 MiB per thread); set `randomx.threads` to try more |
| shares rejected by a pool | the miner switches to uncompressed proofs for pools that need them after the first rejection; a steady stream of rejections means a wrong login or an unsupported pool |
| wrong results or a hung GPU after an offset search | too high an offset: lower `gpu_offset` or set it to 0, and reboot if the GPU hangs; after a hang during a search the next search stays below the offset it was trying (`cavaminer-offset-trial.json`) |
| "no result for 30 s: a kernel is stuck on the GPU … restarting the miner" | computing errors left a kernel stuck (a clock offset too high, or a hardware fault): the miner lowers a saved offset by two steps and restarts itself; if it happens without an offset, look at the GPU's temperature, power and risers |
| the power limit or clocks changed outside the miner | an overclocking tool or `nvidia-smi` runs beside it: let one of them manage the GPU |
| clocks are still locked, or a clock offset still set, after a crash | `sudo nvidia-smi -rgc` and `sudo nvidia-smi -rmc` reset the locks; the offset is reset when the next run that sets one (`gpu_offset`, or `--gpu-offset 0`) exits |
| "web interface off: cannot listen on …" | the address is in use (another miner shutting down is waited for 30 s): change `miner.api` |
| the electricity page shows "no prices yet" | the source answered nothing yet or needs a token or area: `cavaminer prices` prints the error, `cavaminer prices --list` the areas |
| Windows: "An Application Control policy has blocked this file" | Smart App Control blocks the unsigned program (see Windows); a signed release will follow |
| Windows: power limits and clocks are refused, RandomX runs on normal pages | the terminal is not elevated (run it as administrator), or the account lacks "Lock pages in memory" (`cavaminer hugepages --persist`) |

## License

CavaMiner is free to use, on any number of computers, privately or
commercially, and the unchanged release may be passed on free of charge;
modifying it and reverse engineering it are not allowed, except that the
integrations (such as Home Assistant) may be changed and passed on
(`LICENSE`). The open-source components it contains keep their own
licenses (`THIRD-PARTY-NOTICES.txt`).

