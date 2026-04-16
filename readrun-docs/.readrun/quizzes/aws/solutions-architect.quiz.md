---
title: AWS Solutions Architect
description: Practice exam for SAA-C03
---

## [info] AWS Solutions Architect
:::
This quiz covers key topics for the **SAA-C03** exam:

- **S3** — storage classes, object limits, naming
- **Serverless** — Lambda, DynamoDB
- **IAM** — Identity and Access Management

AWS pricing often uses formulas like:

$$C = \sum_{i=1}^{n} r_i \cdot t_i \cdot p_i$$

where $r_i$ is the resource count, $t_i$ is the duration in hours, and $p_i$ is the per-unit price.

> Tip: Read each question carefully before answering!
:::

# S3 Storage

## [single] Which S3 storage class is cheapest for infrequent access?
- S3 Standard
- S3 Glacier
- S3 Standard-IA
- S3 One Zone-IA *
?> Think about which class trades redundancy for lower cost.
> One Zone-IA is cheapest but lacks multi-AZ redundancy.

## [group] Answer the following questions about S3:

### [truefalse] S3 bucket names must be globally unique.
true *
> Bucket names share a global namespace across all AWS accounts.

### [single] What is the maximum object size in S3?
- 1 TB
- 5 TB *
- 10 TB
- Unlimited
> The maximum object size in S3 is 5 terabytes.

### [freetext] What does S3 stand for?
= Simple Storage Service
> S3 = Simple Storage Service.

# Serverless & IAM

## [multi] Which services are serverless? (select all that apply)
- EC2
- Lambda *
- DynamoDB *
- RDS
?> Serverless means you don't provision or manage servers.
> Lambda and DynamoDB require no server management.

## [freetext] What does IAM stand for?
= Identity and Access Management
?> It's three words: **I**___ **A**___ **M**___
> IAM controls who can do what in your AWS account.
