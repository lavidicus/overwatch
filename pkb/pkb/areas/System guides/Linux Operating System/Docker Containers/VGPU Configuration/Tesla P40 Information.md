


```
root@3USMPVE:/etc/pve/qemu-server# nvidia-smi -q

==============NVSMI LOG==============

Timestamp                                 : Mon Nov 20 00:37:23 2023
Driver Version                            : 535.129.03
CUDA Version                              : Not Found
vGPU Driver Capability
        Heterogenous Multi-vGPU           : Supported

Attached GPUs                             : 1
GPU 00000000:83:00.0
    Product Name                          : Tesla P40
    Product Brand                         : Tesla
    Product Architecture                  : Pascal
    Display Mode                          : Enabled
    Display Active                        : Disabled
    Persistence Mode                      : Disabled
    Addressing Mode                       : N/A
    vGPU Device Capability
        Fractional Multi-vGPU             : Not Supported
        Heterogeneous Time-Slice Profiles : Supported
        Heterogeneous Time-Slice Sizes    : Not Supported
    MIG Mode
        Current                           : N/A
        Pending                           : N/A
    Accounting Mode                       : Enabled
    Accounting Mode Buffer Size           : 4000
    Driver Model
        Current                           : N/A
        Pending                           : N/A
    Serial Number                         : 0320317060550
    GPU UUID                              : GPU-bcb96e0b-81bf-9648-8611-af34ef926bae
    Minor Number                          : 0
    VBIOS Version                         : 86.02.23.00.00
    MultiGPU Board                        : No
    Board ID                              : 0x8300
    Board Part Number                     : 900-2G610-0000-000
    GPU Part Number                       : 1B38-895-A1
    FRU Part Number                       : N/A
    Module ID                             : 1
    Inforom Version
        Image Version                     : G610.0200.00.03
        OEM Object                        : 1.1
        ECC Object                        : 4.1
        Power Management Object           : N/A
    Inforom BBX Object Flush
        Latest Timestamp                  : N/A
        Latest Duration                   : N/A
    GPU Operation Mode
        Current                           : N/A
        Pending                           : N/A
    GSP Firmware Version                  : N/A
    GPU Virtualization Mode
        Virtualization Mode               : Host VGPU
        Host VGPU Mode                    : Non SR-IOV
    GPU Reset Status
        Reset Required                    : No
        Drain and Reset Recommended       : N/A
    IBMNPU
        Relaxed Ordering Mode             : N/A
    PCI
        Bus                               : 0x83
        Device                            : 0x00
        Domain                            : 0x0000
        Device Id                         : 0x1B3810DE
        Bus Id                            : 00000000:83:00.0
        Sub System Id                     : 0x11D910DE
        GPU Link Info
            PCIe Generation
                Max                       : 3
                Current                   : 3
                Device Current            : 3
                Device Max                : 3
                Host Max                  : N/A
            Link Width
                Max                       : 16x
                Current                   : 16x
        Bridge Chip
            Type                          : N/A
            Firmware                      : N/A
        Replays Since Reset               : 0
        Replay Number Rollovers           : 0
        Tx Throughput                     : 0 KB/s
        Rx Throughput                     : 0 KB/s
        Atomic Caps Inbound               : N/A
        Atomic Caps Outbound              : N/A
    Fan Speed                             : N/A
    Performance State                     : P0
    Clocks Event Reasons
        Idle                              : Not Active
        Applications Clocks Setting       : Not Active
        SW Power Cap                      : Active
        HW Slowdown                       : Not Active
            HW Thermal Slowdown           : Not Active
            HW Power Brake Slowdown       : Not Active
        Sync Boost                        : Not Active
        SW Thermal Slowdown               : Not Active
        Display Clock Setting             : Not Active
    FB Memory Usage
        Total                             : 24576 MiB
        Reserved                          : 0 MiB
        Used                              : 54 MiB
        Free                              : 24521 MiB
    BAR1 Memory Usage
        Total                             : 32768 MiB
        Used                              : 2 MiB
        Free                              : 32766 MiB
    Conf Compute Protected Memory Usage
        Total                             : 0 MiB
        Used                              : 0 MiB
        Free                              : 0 MiB
    Compute Mode                          : Default
    Utilization
        Gpu                               : 1 %
        Memory                            : 0 %
        Encoder                           : 0 %
        Decoder                           : 0 %
        JPEG                              : N/A
        OFA                               : N/A
    Encoder Stats
        Active Sessions                   : 0
        Average FPS                       : 0
        Average Latency                   : 0
    FBC Stats
        Active Sessions                   : 0
        Average FPS                       : 0
        Average Latency                   : 0
    ECC Mode
        Current                           : Disabled
        Pending                           : Disabled
    ECC Errors
        Volatile
            Single Bit
                Device Memory             : N/A
                Register File             : N/A
                L1 Cache                  : N/A
                L2 Cache                  : N/A
                Texture Memory            : N/A
                Texture Shared            : N/A
                CBU                       : N/A
                Total                     : N/A
            Double Bit
                Device Memory             : N/A
                Register File             : N/A
                L1 Cache                  : N/A
                L2 Cache                  : N/A
                Texture Memory            : N/A
                Texture Shared            : N/A
                CBU                       : N/A
                Total                     : N/A
        Aggregate
            Single Bit
                Device Memory             : N/A
                Register File             : N/A
                L1 Cache                  : N/A
                L2 Cache                  : N/A
                Texture Memory            : N/A
                Texture Shared            : N/A
                CBU                       : N/A
                Total                     : N/A
            Double Bit
                Device Memory             : N/A
                Register File             : N/A
                L1 Cache                  : N/A
                L2 Cache                  : N/A
                Texture Memory            : N/A
                Texture Shared            : N/A
                CBU                       : N/A
                Total                     : N/A
    Retired Pages
        Single Bit ECC                    : 0
        Double Bit ECC                    : 0
        Pending Page Blacklist            : No
    Remapped Rows                         : N/A
    Temperature
        GPU Current Temp                  : 69 C
        GPU T.Limit Temp                  : N/A
        GPU Shutdown Temp                 : 95 C
        GPU Slowdown Temp                 : 92 C
        GPU Max Operating Temp            : N/A
        GPU Target Temperature            : N/A
        Memory Current Temp               : N/A
        Memory Max Operating Temp         : N/A
    GPU Power Readings
        Power Draw                        : 52.50 W
        Current Power Limit               : 250.00 W
        Requested Power Limit             : 250.00 W
        Default Power Limit               : 250.00 W
        Min Power Limit                   : 125.00 W
        Max Power Limit                   : 250.00 W
    Module Power Readings
        Power Draw                        : N/A
        Current Power Limit               : N/A
        Requested Power Limit             : N/A
        Default Power Limit               : N/A
        Min Power Limit                   : N/A
        Max Power Limit                   : N/A
    Clocks
        Graphics                          : 544 MHz
        SM                                : 544 MHz
        Memory                            : 3615 MHz
        Video                             : 658 MHz
    Applications Clocks
        Graphics                          : 1303 MHz
        Memory                            : 3615 MHz
    Default Applications Clocks
        Graphics                          : 1303 MHz
        Memory                            : 3615 MHz
    Deferred Clocks
        Memory                            : N/A
    Max Clocks
        Graphics                          : 1531 MHz
        SM                                : 1531 MHz
        Memory                            : 3615 MHz
        Video                             : 1379 MHz
    Max Customer Boost Clocks
        Graphics                          : 1531 MHz
    Clock Policy
        Auto Boost                        : N/A
        Auto Boost Default                : N/A
    Voltage
        Graphics                          : N/A
    Fabric
        State                             : N/A
        Status                            : N/A
    Processes                             : None

```